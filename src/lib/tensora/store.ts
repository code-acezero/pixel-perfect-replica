import { create } from "zustand";
import { toast } from "sonner";
import {
  alertsSeed,
  buyersSeed,
  certificatesSeed,
  defectsSeed,
  devicesSeed,
  rollsSeed,
  sessionsSeed,
  type Alert,
  type Buyer,
  type Certificate,
  type Defect,
  type DefectClass,
  type DefectStatus,
  type Device,
  type Roll,
  type Session,
} from "./data";
import { scoreFor } from "./scoring";
import * as cloud from "./cloud";
import { type DbRole } from "./permissions";

export type Role = "Field Inspector" | "QC Lead" | "Quality Manager" | "Plant Admin" | "Buyer Auditor";
export const ROLES: Role[] = ["Field Inspector", "QC Lead", "Quality Manager", "Plant Admin", "Buyer Auditor"];

export interface Me {
  id: string;
  name: string;
  email: string;
  role: DbRole;
}

interface Snapshot {
  rolls: Roll[];
  buyers: Buyer[];
  defects: Defect[];
  devices: Device[];
  sessions: Session[];
  alerts: Alert[];
  certificates: Certificate[];
}

interface TensoraState extends Snapshot {
  ready: boolean;
  me: Me | null;
  streamMode: "sim" | "live";
  activeRollId: string;
  activeSessionId: string;
  paused: boolean;
  speed: number; // m/min
  feedbackCount: number;
  hydrate: (snap: Snapshot, me: Me) => void;
  reset: () => void;
  upsertDefect: (d: Defect) => void;
  upsertAlert: (a: Alert | null, removedId?: string) => void;
  upsertSession: (s: Session) => void;
  upsertCertificate: (c: Certificate) => void;
  setStreamMode: (m: "sim" | "live") => void;
  setPaused: (p: boolean) => void;
  setActiveRoll: (id: string) => void;
  advance: (meters: number) => void;
  addDefect: (d: Omit<Defect, "id">) => void;
  setDefectStatus: (id: string, status: DefectStatus) => void;
  reclassify: (id: string, cls: DefectClass, points: number) => void;
  updateBuyer: (id: string, patch: Partial<Buyer>) => void;
  issueCertificate: (rollId: string) => string;
  dismissAlert: (id: string) => void;
}

function report(res: PromiseLike<{ error: { message: string } | null }>, what: string) {
  void Promise.resolve(res).then(({ error }) => {
    if (error) toast.error(`Couldn't save ${what}`, { description: error.message });
  });
}

// Inspection progress is flushed to the cloud every few seconds rather than every tick.
let progressTimer: ReturnType<typeof setTimeout> | null = null;

export const useTensora = create<TensoraState>((set, get) => ({
  ready: false,
  me: null,
  streamMode: "sim",
  activeRollId: "TX-8829",
  activeSessionId: "INS-2026-000418",
  paused: false,
  speed: 42,
  rolls: rollsSeed,
  buyers: buyersSeed,
  defects: defectsSeed,
  devices: devicesSeed,
  sessions: sessionsSeed,
  alerts: alertsSeed,
  certificates: certificatesSeed,
  feedbackCount: 1284,
  hydrate: (snap, me) => {
    const s = get();
    const activeRollId = snap.rolls.some((r) => r.id === s.activeRollId) ? s.activeRollId : (snap.rolls[0]?.id ?? s.activeRollId);
    const live = snap.sessions.find((x) => x.rollId === activeRollId && x.status === "live");
    set({
      ...snap,
      me,
      ready: true,
      activeRollId,
      activeSessionId: live?.id ?? snap.sessions[0]?.id ?? s.activeSessionId,
      feedbackCount: 1284 + snap.defects.filter((d) => d.reviewer).length,
      paused: me.role === "buyer_auditor",
    });
  },
  reset: () => set({ ready: false, me: null }),
  upsertDefect: (d) =>
    set((s) => {
      const i = s.defects.findIndex((x) => x.id === d.id);
      if (i === -1) return { defects: [d, ...s.defects] };
      const next = s.defects.slice();
      next[i] = { ...d, thumb: d.thumb ?? s.defects[i]!.thumb };
      return { defects: next };
    }),
  upsertAlert: (a, removedId) =>
    set((s) => {
      if (removedId) return { alerts: s.alerts.filter((x) => x.id !== removedId) };
      if (!a || s.alerts.some((x) => x.id === a.id)) return {};
      return { alerts: [a, ...s.alerts] };
    }),
  upsertSession: (x) =>
    set((s) => {
      const i = s.sessions.findIndex((y) => y.id === x.id);
      if (i === -1) return { sessions: [x, ...s.sessions] };
      if (x.id === s.activeSessionId) return {}; // local device owns the live counter
      const next = s.sessions.slice();
      next[i] = x;
      return { sessions: next };
    }),
  upsertCertificate: (c) =>
    set((s) =>
      s.certificates.some((x) => x.id === c.id)
        ? {}
        : { certificates: [c, ...s.certificates], rolls: s.rolls.map((r) => (r.id === c.rollId ? { ...r, status: "certified" } : r)) },
    ),
  setStreamMode: (streamMode) => set({ streamMode }),
  setPaused: (paused) => set({ paused }),
  setActiveRoll: (activeRollId) => set({ activeRollId }),
  advance: (meters) => {
    set((s) => ({
      rolls: s.rolls.map((r) => (r.id === s.activeRollId ? { ...r, lengthM: +(r.lengthM + meters).toFixed(2) } : r)),
      sessions: s.sessions.map((x) =>
        x.id === s.activeSessionId ? { ...x, metersInspected: +(x.metersInspected + meters).toFixed(2) } : x,
      ),
    }));
    if (!progressTimer) {
      progressTimer = setTimeout(() => {
        progressTimer = null;
        const s = get();
        if (!s.ready) return;
        const roll = s.rolls.find((r) => r.id === s.activeRollId);
        const sess = s.sessions.find((x) => x.id === s.activeSessionId);
        if (roll && sess) void cloud.saveProgress(roll.id, roll.lengthM, sess.id, sess.metersInspected);
      }, 5000);
    }
  },
  addDefect: (d) => {
    const full: Defect = { ...d, id: cloud.newId("DF") };
    set((s) => ({ defects: [full, ...s.defects] }));
    if (get().ready) report(cloud.insertDefect(full), "defect");
  },
  setDefectStatus: (id, status) => {
    const reviewer = get().me?.name ?? "You";
    set((s) => ({
      defects: s.defects.map((d) => (d.id === id ? { ...d, status, reviewer } : d)),
      feedbackCount: s.feedbackCount + 1,
    }));
    report(cloud.updateDefect(id, { status, reviewer }), "review");
  },
  reclassify: (id, cls, points) => {
    const reviewer = get().me?.name ?? "You";
    const prev = get().defects.find((d) => d.id === id);
    const originalCls = prev?.originalCls ?? prev?.cls;
    set((s) => ({
      defects: s.defects.map((d) => (d.id === id ? { ...d, originalCls, cls, points, status: "reclassified", reviewer } : d)),
      feedbackCount: s.feedbackCount + 1,
    }));
    report(cloud.updateDefect(id, { cls, points, status: "reclassified", reviewer, originalCls }), "reclassification");
  },
  updateBuyer: (id, patch) => {
    set((s) => ({ buyers: s.buyers.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
    report(cloud.updateBuyerRow(id, patch), "buyer standard");
  },
  issueCertificate: (rollId) => {
    const s = get();
    const existing = s.certificates.find((c) => c.rollId === rollId);
    if (existing) return existing.id;
    const roll = s.rolls.find((r) => r.id === rollId)!;
    const buyer = s.buyers.find((b) => b.id === roll.buyerId)!;
    const pts = countedPoints(s.defects, rollId);
    const score = scoreFor(buyer.system, pts, roll.lengthM, roll.widthIn);
    const maxNum = s.certificates.reduce((m, c) => Math.max(m, Number(c.id.split("-").pop()) || 0), 0);
    const id = `QAC-2026-${String(maxNum + 1).padStart(4, "0")}`;
    const cert: Certificate = { id, rollId, issuedAt: Date.now(), issuer: s.me?.name ?? "You", verdict: score <= buyer.limit ? "PASS" : "REJECT", score: +score.toFixed(2) };
    set({
      certificates: [cert, ...s.certificates],
      rolls: s.rolls.map((r) => (r.id === rollId ? { ...r, status: "certified" } : r)),
    });
    report(cloud.insertCertificate(cert), "certificate");
    report(cloud.setRollStatus(rollId, "certified"), "roll status");
    return id;
  },
  dismissAlert: (id) => {
    set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) }));
    report(cloud.deleteAlert(id), "alert");
  },
}));

/** Points that count toward the score: everything not dismissed. */
export function countedPoints(defects: Defect[], rollId: string) {
  return defects
    .filter((d) => d.rollId === rollId && d.status !== "dismissed")
    .reduce((a, d) => a + d.points, 0);
}

export function rollStats(state: Pick<TensoraState, "defects" | "rolls" | "buyers">, rollId: string) {
  const roll = state.rolls.find((r) => r.id === rollId)!;
  const buyer = state.buyers.find((b) => b.id === roll.buyerId)!;
  const list = state.defects.filter((d) => d.rollId === rollId && d.status !== "dismissed");
  const points = list.reduce((a, d) => a + d.points, 0);
  const score = scoreFor(buyer.system, points, roll.lengthM, roll.widthIn);
  const breakdown = [1, 2, 3, 4].map((p) => list.filter((d) => d.points === p).length);
  return { roll, buyer, list, points, score, breakdown, pass: score <= buyer.limit };
}
