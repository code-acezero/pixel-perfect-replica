import { create } from "zustand";
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

export type Role = "Field Inspector" | "QC Lead" | "Quality Manager" | "Plant Admin" | "Buyer Auditor";
export const ROLES: Role[] = ["Field Inspector", "QC Lead", "Quality Manager", "Plant Admin", "Buyer Auditor"];

interface TensoraState {
  role: Role;
  streamMode: "sim" | "live";
  activeRollId: string;
  activeSessionId: string;
  paused: boolean;
  speed: number; // m/min
  rolls: Roll[];
  buyers: Buyer[];
  defects: Defect[];
  devices: Device[];
  sessions: Session[];
  alerts: Alert[];
  certificates: Certificate[];
  feedbackCount: number;
  setRole: (r: Role) => void;
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

let defectSeq = 500;

export const useTensora = create<TensoraState>((set, get) => ({
  role: "Quality Manager",
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
  setRole: (role) => set({ role }),
  setStreamMode: (streamMode) => set({ streamMode }),
  setPaused: (paused) => set({ paused }),
  setActiveRoll: (activeRollId) => set({ activeRollId }),
  advance: (meters) =>
    set((s) => ({
      rolls: s.rolls.map((r) =>
        r.id === s.activeRollId ? { ...r, lengthM: +(r.lengthM + meters).toFixed(2) } : r,
      ),
      sessions: s.sessions.map((x) =>
        x.id === s.activeSessionId ? { ...x, metersInspected: +(x.metersInspected + meters).toFixed(2) } : x,
      ),
    })),
  addDefect: (d) => {
    defectSeq += 1;
    set((s) => ({ defects: [{ ...d, id: `DF-000${defectSeq}` }, ...s.defects] }));
  },
  setDefectStatus: (id, status) =>
    set((s) => ({
      defects: s.defects.map((d) => (d.id === id ? { ...d, status, reviewer: "You" } : d)),
      feedbackCount: s.feedbackCount + 1,
    })),
  reclassify: (id, cls, points) =>
    set((s) => ({
      defects: s.defects.map((d) =>
        d.id === id
          ? { ...d, originalCls: d.originalCls ?? d.cls, cls, points, status: "reclassified", reviewer: "You" }
          : d,
      ),
      feedbackCount: s.feedbackCount + 1,
    })),
  updateBuyer: (id, patch) =>
    set((s) => ({ buyers: s.buyers.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
  issueCertificate: (rollId) => {
    const s = get();
    const existing = s.certificates.find((c) => c.rollId === rollId);
    if (existing) return existing.id;
    const roll = s.rolls.find((r) => r.id === rollId)!;
    const buyer = s.buyers.find((b) => b.id === roll.buyerId)!;
    const pts = countedPoints(s.defects, rollId);
    const score = scoreFor(buyer.system, pts, roll.lengthM, roll.widthIn);
    const id = `QAC-2026-00${32 + s.certificates.length - 2}`;
    set({
      certificates: [
        { id, rollId, issuedAt: Date.now(), issuer: "You", verdict: score <= buyer.limit ? "PASS" : "REJECT", score },
        ...s.certificates,
      ],
      rolls: s.rolls.map((r) => (r.id === rollId ? { ...r, status: "certified" } : r)),
    });
    return id;
  },
  dismissAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
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
