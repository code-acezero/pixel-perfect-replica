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
  defaultRecipes,
  defaultTaxonomy,
  defaultSites,
  defaultAuditLogs,
  type Alert,
  type Buyer,
  type Certificate,
  type Defect,
  type DefectClass,
  type DefectStatus,
  type Device,
  type Roll,
  type Session,
  type Recipe,
  type TaxonomySetting,
  type SiteSetting,
  type AuditEntry,
} from "./data";
import { scoreFor, getSpatialZone } from "./scoring";
import * as cloud from "./cloud";
import { write } from "./offline";
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

export interface CaptureTelemetry {
  lighting: number;
  focus: number;
  motionBlur: number;
  coverage: number;
  colorFidelity: number;
  tip: string;
  lastUpdated: number;
}

interface TensoraState extends Snapshot {
  ready: boolean;
  me: Me | null;
  language: "en" | "bn";
  setLanguage: (lang: "en" | "bn") => void;
  floorAlarmEnabled: boolean;
  setFloorAlarmEnabled: (enabled: boolean) => void;
  streamMode: "sim" | "live";
  selectedDeviceId: string;
  sessionLocation: string;
  captureTelemetry: CaptureTelemetry;
  recipes: Recipe[];
  taxonomy: TaxonomySetting[];
  sites: SiteSetting[];
  auditLogs: AuditEntry[];
  activeRollId: string;
  activeSessionId: string;
  paused: boolean;
  speed: number; // m/min
  feedbackCount: number;
  hydrate: (snap: Snapshot, me: Me) => void;
  reset: () => void;
  setSelectedDeviceId: (id: string) => void;
  setSessionLocation: (loc: string) => void;
  updateCaptureTelemetry: (patch: Partial<CaptureTelemetry>) => void;
  addRoll: (roll: Roll) => void;
  addDevice: (d: Device) => void;
  updateDevice: (id: string, patch: Partial<Device>) => void;
  pairDevice: (id: string, patch?: Partial<Device>) => void;
  updateRecipe: (id: string, patch: Partial<Recipe>) => void;
  updateTaxonomy: (cls: DefectClass, patch: Partial<TaxonomySetting>) => void;
  updateSite: (id: string, patch: Partial<SiteSetting>) => void;
  addAuditEntry: (action: string) => void;
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


// Inspection progress is flushed to the cloud every few seconds rather than every tick.
let progressTimer: ReturnType<typeof setTimeout> | null = null;

export const useTensora = create<TensoraState>((set, get) => ({
  ready: false,
  me: null,
  language: "en",
  setLanguage: (language) => set({ language }),
  floorAlarmEnabled: true,
  setFloorAlarmEnabled: (floorAlarmEnabled) => set({ floorAlarmEnabled }),
  streamMode: "sim",
  selectedDeviceId: "rear",
  sessionLocation: "Line #04 · Take-down",
  captureTelemetry: {
    lighting: 92,
    focus: 88,
    motionBlur: 81,
    coverage: 64,
    colorFidelity: 95,
    tip: "Hold 30–45 cm from fabric surface.",
    lastUpdated: Date.now(),
  },
  recipes: defaultRecipes,
  taxonomy: defaultTaxonomy,
  sites: defaultSites,
  auditLogs: defaultAuditLogs,
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
  setSelectedDeviceId: (selectedDeviceId) => set({ selectedDeviceId }),
  setSessionLocation: (sessionLocation) => set({ sessionLocation }),
  updateCaptureTelemetry: (patch) =>
    set((s) => ({
      captureTelemetry: { ...s.captureTelemetry, ...patch, lastUpdated: Date.now() },
    })),
  addRoll: (roll) =>
    set((s) => {
      const exists = s.rolls.some((r) => r.id === roll.id);
      const rolls = exists ? s.rolls.map((r) => (r.id === roll.id ? { ...r, ...roll } : r)) : [roll, ...s.rolls];
      const hasSession = s.sessions.some((sess) => sess.rollId === roll.id);
      const newSession: Session | null = hasSession
        ? null
        : {
            id: `INS-2026-${String(s.sessions.length + 420).padStart(6, "0")}`,
            rollId: roll.id,
            deviceId: s.selectedDeviceId || "CAM-01",
            inspector: s.me?.name ?? "Field Inspector",
            location: s.sessionLocation,
            site: roll.site || "ASH-U03",
            startedAt: Date.now(),
            status: "live",
            metersInspected: 0,
          };

      // Persist roll and new session to Supabase & outbox
      if (!exists) {
        write({ kind: "insertRoll", roll }, `roll #${roll.id}`);
      }
      if (newSession) {
        write({ kind: "insertSession", s: newSession }, `session #${newSession.id}`);
      }

      const audit: AuditEntry = {
        id: `aud-${Date.now()}`,
        ts: Date.now(),
        actor: s.me?.name ?? "Field Inspector",
        action: `Roll #${roll.id} (${roll.article}, Lot ${roll.lot}) registered for inspection`,
      };
      return {
        rolls,
        activeRollId: roll.id,
        sessions: newSession ? [newSession, ...s.sessions] : s.sessions,
        activeSessionId: newSession ? newSession.id : s.activeSessionId,
        auditLogs: [audit, ...s.auditLogs],
      };
    }),
  addDevice: (d) => {
    write({ kind: "upsertDevice", device: d }, `device ${d.id}`);
    set((s) => ({ devices: [d, ...s.devices] }));
  },
  updateDevice: (id, patch) =>
    set((s) => {
      const dev = s.devices.find((d) => d.id === id);
      if (dev) {
        const updated = { ...dev, ...patch };
        write({ kind: "upsertDevice", device: updated }, `device ${id}`);
        return { devices: s.devices.map((d) => (d.id === id ? updated : d)) };
      }
      return s;
    }),
  pairDevice: (id, patch = {}) =>
    set((s) => {
      const exists = s.devices.find((d) => d.id === id);
      const audit: AuditEntry = {
        id: `aud-${Date.now()}`,
        ts: Date.now(),
        actor: s.me?.name ?? "Operator",
        action: `Device ${id} paired and connected live`,
      };
      if (exists) {
        const updated = { ...exists, status: "online" as const, lastSession: "Just now", ...patch };
        write({ kind: "upsertDevice", device: updated }, `pair device ${id}`);
        return {
          devices: s.devices.map((d) => (d.id === id ? updated : d)),
          selectedDeviceId: id,
          auditLogs: [audit, ...s.auditLogs],
        };
      }
      const newDev: Device = {
        id,
        name: patch.name || `Device ${id}`,
        kind: patch.kind || "Phone",
        location: patch.location || s.sessionLocation,
        status: "online",
        resolution: patch.resolution || "4K",
        fps: patch.fps || 60,
        quality: patch.quality || 92,
        lastSession: "Just now",
        calibrated: true,
        batteryPct: patch.batteryPct ?? 100,
        streamRole: patch.streamRole || "overhead_main",
        streamUrl: patch.streamUrl || "",
        torchOn: !!patch.torchOn,
        pingMs: patch.pingMs ?? 15,
        ...patch,
      };
      write({ kind: "upsertDevice", device: newDev }, `pair device ${id}`);
      return {
        devices: [newDev, ...s.devices],
        selectedDeviceId: id,
        auditLogs: [audit, ...s.auditLogs],
      };
    }),
  updateRecipe: (id, patch) =>
    set((s) => {
      const updated = s.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r));
      const target = s.recipes.find((r) => r.id === id);
      const action = `Recipe '${target?.name ?? id}' updated (${Object.entries(patch).map(([k, v]) => `${k}: ${v}`).join(", ")})`;
      const audit: AuditEntry = { id: `aud-${Date.now()}`, ts: Date.now(), actor: s.me?.name ?? "QC Lead", action };
      return { recipes: updated, auditLogs: [audit, ...s.auditLogs] };
    }),
  updateTaxonomy: (cls, patch) =>
    set((s) => {
      const updated = s.taxonomy.map((t) => (t.cls === cls ? { ...t, ...patch } : t));
      const action = `Taxonomy '${cls}' updated (${Object.entries(patch).map(([k, v]) => `${k}: ${v}`).join(", ")})`;
      const audit: AuditEntry = { id: `aud-${Date.now()}`, ts: Date.now(), actor: s.me?.name ?? "Quality Manager", action };
      return { taxonomy: updated, auditLogs: [audit, ...s.auditLogs] };
    }),
  updateSite: (id, patch) =>
    set((s) => ({
      sites: s.sites.map((st) => (st.id === id ? { ...st, ...patch } : st)),
    })),
  addAuditEntry: (action) =>
    set((s) => ({
      auditLogs: [{ id: `aud-${Date.now()}`, ts: Date.now(), actor: s.me?.name ?? "Operator", action }, ...s.auditLogs],
    })),
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
      const thumb = d.thumb ?? s.defects[i]!.thumb;
      next[i] = thumb ? { ...d, thumb } : d;
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
        if (roll && sess) write({ kind: "saveProgress", rollId: roll.id, lengthM: roll.lengthM, sessionId: sess.id, meters: sess.metersInspected }, "inspection progress");
      }, 5000);
    }
  },
  addDefect: (d) => {
    const zone = d.zone ?? getSpatialZone(d.x);
    const full: Defect = {
      ...d,
      id: cloud.newId("DF"),
      zone,
      lengthIn: d.lengthIn ?? (d.points === 1 ? 2.5 : d.points === 2 ? 5.0 : d.points === 3 ? 8.0 : 10.0),
      isContinuous: d.isContinuous ?? false,
    };
    set((s) => ({ defects: [full, ...s.defects] }));
    if (get().ready) write({ kind: "insertDefect", d: full }, "defect");
  },
  setDefectStatus: (id, status) => {
    const reviewer = get().me?.name ?? "You";
    set((s) => ({
      defects: s.defects.map((d) => (d.id === id ? { ...d, status, reviewer } : d)),
      feedbackCount: s.feedbackCount + 1,
    }));
    write({ kind: "updateDefect", id, patch: { status, reviewer } }, "review");
  },
  reclassify: (id, cls, points) => {
    const reviewer = get().me?.name ?? "You";
    const prev = get().defects.find((d) => d.id === id);
    const originalCls = (prev?.originalCls ?? prev?.cls ?? cls) as DefectClass;
    set((s) => ({
      defects: s.defects.map((d) => (d.id === id ? { ...d, originalCls, cls, points, status: "reclassified", reviewer } : d)),
      feedbackCount: s.feedbackCount + 1,
    }));
    write({ kind: "updateDefect", id, patch: { cls, points, status: "reclassified", reviewer, originalCls } }, "reclassification");
  },
  updateBuyer: (id, patch) => {
    set((s) => ({ buyers: s.buyers.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
    write({ kind: "updateBuyer", id, patch }, "buyer standard");
  },
  issueCertificate: (rollId) => {
    const s = get();
    const existing = s.certificates.find((c) => c.rollId === rollId);
    if (existing) return existing.id;
    const roll = s.rolls.find((r) => r.id === rollId)!;
    const buyer = s.buyers.find((b) => b.id === roll.buyerId)!;
    const pts = countedPoints(s.defects, rollId);
    const score = scoreFor(buyer.system, pts, roll.lengthM, roll.widthIn, roll.cuttableWidthIn);
    const maxNum = s.certificates.reduce((m, c) => Math.max(m, Number(c.id.split("-").pop()) || 0), 0);
    const id = `QAC-2026-${String(maxNum + 1).padStart(4, "0")}`;
    const cert: Certificate = { id, rollId, issuedAt: Date.now(), issuer: s.me?.name ?? "You", verdict: score <= buyer.limit ? "PASS" : "REJECT", score: +score.toFixed(2) };
    set({
      certificates: [cert, ...s.certificates],
      rolls: s.rolls.map((r) => (r.id === rollId ? { ...r, status: "certified" } : r)),
    });
    write({ kind: "insertCertificate", c: cert }, "certificate");
    write({ kind: "setRollStatus", id: rollId, status: "certified" }, "roll status");
    return id;
  },
  dismissAlert: (id) => {
    set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) }));
    write({ kind: "deleteAlert", id }, "alert");
  },
}));

/** Points that count toward the score: everything not dismissed. */
export function countedPoints(defects: Defect[], rollId: string) {
  return defects
    .filter((d) => d.rollId === rollId && d.status !== "dismissed")
    .reduce((a, d) => a + d.points, 0);
}

const DEFAULT_FALLBACK_BUYER: Buyer = {
  id: "BYR-HM-01",
  name: "H&M Standard",
  system: "4pt",
  limit: 20,
  region: "EU",
};

export function rollStats(state: Pick<TensoraState, "defects" | "rolls" | "buyers">, rollId: string) {
  const roll = state.rolls.find((r) => r.id === rollId) ?? {
    id: rollId,
    article: "100% Combed Cotton Single Jersey",
    gsm: 180,
    widthIn: 60,
    lengthM: 100,
    buyerId: state.buyers[0]?.id ?? "BYR-HM-01",
    lot: "LOT-2026-0001",
    yarnLot: "YL-30S-0001",
    supplier: "Square Yarns Ltd",
    site: "ASH-U03",
    line: "ASH-U03-L04",
    status: "inspecting" as const,
    gsmMeasured: 180,
    widthMeasured: 60,
    bowPct: 0.0,
    shadeDE: 0.0,
    shrinkPct: 0.0,
  };
  const buyer = state.buyers.find((b) => b.id === roll.buyerId) ?? state.buyers[0] ?? DEFAULT_FALLBACK_BUYER;
  const list = state.defects.filter((d) => d.rollId === rollId && d.status !== "dismissed");
  const points = list.reduce((a, d) => a + d.points, 0);
  const score = scoreFor(buyer.system, points, roll.lengthM || 1, roll.widthIn || 60, roll.cuttableWidthIn);
  const breakdown = [1, 2, 3, 4].map((p) => list.filter((d) => d.points === p).length);
  return { roll, buyer, list, points, score, breakdown, pass: score <= buyer.limit };
}
