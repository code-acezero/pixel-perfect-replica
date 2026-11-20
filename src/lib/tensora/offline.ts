import { create } from "zustand";
import { toast } from "sonner";
import * as cloud from "./cloud";
import type { Buyer, Certificate, Defect, Device, Roll, Session } from "./data";

/** Writes that can be replayed later. Each op is plain data so it survives in IndexedDB. */
export type Op =
  | { kind: "insertRoll"; roll: Roll }
  | { kind: "insertSession"; s: Session }
  | { kind: "upsertDevice"; device: Device }
  | { kind: "insertDefect"; d: Defect }
  | { kind: "updateDefect"; id: string; patch: Partial<Defect> }
  | { kind: "updateBuyer"; id: string; patch: Partial<Buyer> }
  | { kind: "insertCertificate"; c: Certificate }
  | { kind: "setRollStatus"; id: string; status: Roll["status"] }
  | { kind: "deleteAlert"; id: string }
  | { kind: "saveProgress"; rollId: string; lengthM: number; sessionId: string; meters: number };

export const useSync = create<{ online: boolean; pending: number; syncing: boolean }>(() => ({ online: true, pending: 0, syncing: false }));

const DB = "tensora-offline";
let dbp: Promise<IDBDatabase> | null = null;
function db() {
  dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("outbox", { keyPath: "seq", autoIncrement: true });
      r.result.createObjectStore("kv");
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const req = fn(d.transaction(store, mode).objectStore(store));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function refreshCount() {
  useSync.setState({ pending: await tx("outbox", "readonly", (s) => s.count()) });
}

export const isOffline = () => typeof navigator !== "undefined" && !navigator.onLine;
const isNetworkError = (msg: string) => /fetch|network|load failed|timed? ?out/i.test(msg);

async function run(op: Op): Promise<{ error: { message: string; code?: string } | null }> {
  switch (op.kind) {
    case "insertRoll": return cloud.insertRoll(op.roll);
    case "insertSession": return cloud.insertSession(op.s);
    case "upsertDevice": return cloud.upsertDevice(op.device);
    case "insertDefect": return cloud.insertDefect(op.d);
    case "updateDefect": return cloud.updateDefect(op.id, op.patch);
    case "updateBuyer": return cloud.updateBuyerRow(op.id, op.patch);
    case "setRollStatus": return cloud.setRollStatus(op.id, op.status);
    case "deleteAlert": return cloud.deleteAlert(op.id);
    case "saveProgress": {
      const [a, b] = await cloud.saveProgress(op.rollId, op.lengthM, op.sessionId, op.meters);
      return { error: a.error ?? b.error };
    }
    case "insertCertificate": {
      const r = await cloud.insertCertificate(op.c);
      if (!r.error) void sendToErp(op.c.id);
      return r;
    }
  }
}

async function sendToErp(certId: string) {
  try {
    const { dispatchCertified } = await import("./integrations.functions");
    const r = await dispatchCertified({ data: { certId } });
    if (r.failed.length) toast.error(`ERP/MES update failed: ${r.failed.join(", ")}`);
    else if (r.sent) toast.success(`Sent to ${r.sent} ERP/MES system${r.sent > 1 ? "s" : ""}`);
  } catch (e) {
    toast.error("ERP/MES update failed", { description: e instanceof Error ? e.message : String(e) });
  }
}

let lastErrorToastTime = 0;
function notifySyncError(title: string, description: string) {
  const now = Date.now();
  // Throttle error notifications so inspection stream doesn't flood the UI
  if (now - lastErrorToastTime < 5000) return;
  lastErrorToastTime = now;
  toast.error(title, {
    id: "offline-sync-error",
    description,
    duration: 3500,
  });
}

/** Run a write now, or queue it on this device if there's no connection. */
export function write(op: Op, what: string) {
  const queue = async () => {
    await tx("outbox", "readwrite", (s) => s.add({ op, what, at: Date.now() }));
    await refreshCount();
  };
  void (async () => {
    if (isOffline()) return queue();
    try {
      const { error } = await run(op);
      if (error && isNetworkError(error.message)) return queue();
      if (error) {
        const isRls = error.message.includes("row-level security") || error.code === "42501";
        notifySyncError(
          `Couldn't save ${what}`,
          isRls ? "Sign in with an inspector role to persist to cloud database" : error.message
        );
      }
    } catch {
      await queue();
    }
  })();
}

let flushing = false;
/** Replay queued writes in order. Stops at the first network failure. */
export async function flush() {
  if (flushing || isOffline()) return;
  flushing = true;
  useSync.setState({ syncing: true });
  let done = 0;
  try {
    const items = await tx<{ seq: number; op: Op; what: string }[]>("outbox", "readonly", (s) => s.getAll());
    for (const it of items) {
      let error: { message: string; code?: string } | null;
      try { ({ error } = await run(it.op)); } catch (e) { error = { message: String(e) }; }
      if (error && isNetworkError(error.message)) break;
      // Duplicate key = already saved on an earlier attempt.
      if (error && error.code !== "23505") {
        const isRls = error.message.includes("row-level security") || error.code === "42501";
        notifySyncError(
          `Couldn't sync ${it.what}`,
          isRls ? "Sign in with an inspector role to persist to cloud database" : error.message
        );
      }
      await tx("outbox", "readwrite", (s) => s.delete(it.seq));
      done++;
    }
  } finally {
    flushing = false;
    useSync.setState({ syncing: false });
    await refreshCount();
    if (done) toast.success(`Synced ${done} offline change${done > 1 ? "s" : ""}`);
  }
}

/** Last successful cloud snapshot, so Capture opens without a connection. */
export const saveSnapshot = (key: string, value: unknown) => tx("kv", "readwrite", (s) => s.put(value, key)).catch(() => undefined);
export const loadSnapshot = <T,>(key: string) => tx<T | undefined>("kv", "readonly", (s) => s.get(key)).catch(() => undefined);

export function startSyncWatcher() {
  const update = () => {
    useSync.setState({ online: navigator.onLine });
    if (navigator.onLine) void flush();
  };
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  const t = setInterval(() => void flush(), 30000);
  update();
  void refreshCount();
  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
    clearInterval(t);
  };
}
