import type { ScoringSystem } from "./scoring";

export type DefectClass =
  | "Needle Line"
  | "Oil Stain"
  | "Hole"
  | "Warp Float"
  | "Drop Stitch"
  | "Slub"
  | "Barre"
  | "Lycra Out";

export const DEFECT_CLASSES: DefectClass[] = [
  "Needle Line",
  "Oil Stain",
  "Hole",
  "Warp Float",
  "Drop Stitch",
  "Slub",
  "Barre",
  "Lycra Out",
];

export const DEFAULT_POINTS: Record<DefectClass, number> = {
  "Needle Line": 2,
  "Oil Stain": 2,
  Hole: 4,
  "Warp Float": 3,
  "Drop Stitch": 3,
  Slub: 1,
  Barre: 2,
  "Lycra Out": 4,
};

export type DefectStatus = "pending" | "confirmed" | "reclassified" | "dismissed";

export interface Defect {
  id: string;
  rollId: string;
  sessionId: string;
  ts: number;
  meter: number;
  /** position across width, 0..1 */
  x: number;
  cls: DefectClass;
  points: number;
  confidence: number;
  status: DefectStatus;
  source: "ai" | "manual";
  thumb?: string;
  reviewer?: string;
  originalCls?: DefectClass;
}

export interface Buyer {
  id: string;
  name: string;
  system: ScoringSystem;
  limit: number;
  region: string;
}

export interface Roll {
  id: string;
  article: string;
  gsm: number;
  widthIn: number;
  lengthM: number;
  buyerId: string;
  lot: string;
  yarnLot: string;
  supplier: string;
  site: string;
  line: string;
  status: "inspecting" | "graded" | "queued" | "certified";
  gsmMeasured: number;
  widthMeasured: number;
  bowPct: number;
  shadeDE: number;
  shrinkPct: number;
}

export interface Device {
  id: string;
  name: string;
  kind: "Phone" | "Tablet" | "Webcam" | "USB Camera" | "IP Camera";
  location: string;
  status: "online" | "idle" | "offline";
  resolution: string;
  fps: number;
  quality: number;
  lastSession: string;
  calibrated: boolean;
}

export interface Session {
  id: string;
  rollId: string;
  deviceId: string;
  inspector: string;
  location: string;
  site: string;
  startedAt: number;
  status: "live" | "completed" | "paused";
  metersInspected: number;
}

export interface Alert {
  id: string;
  level: "major" | "minor" | "info";
  title: string;
  body: string;
  ts: number;
  location: string;
  savings?: number;
}

export interface Certificate {
  id: string;
  rollId: string;
  issuedAt: number;
  issuer: string;
  verdict: "PASS" | "REJECT";
  score: number;
}

export const BASE_TS = Date.UTC(2026, 9, 11, 8, 0, 0);

export const SITE = {
  id: "ASH-U03",
  name: "Ashulia Mill — Unit 03",
  line: "Line #04 (Circular Knit)",
  lineId: "ASH-U03-L04",
};

export const INSPECTORS = ["R. Hossain", "S. Akter", "M. Rahman", "T. Islam", "N. Chowdhury"];

export const buyersSeed: Buyer[] = [
  { id: "BYR-HM-01", name: "H&M Group", system: "4pt", limit: 24, region: "EU" },
  { id: "BYR-ZR-02", name: "Inditex / Zara", system: "4pt", limit: 20, region: "EU" },
  { id: "BYR-PV-03", name: "PVH Corp", system: "10pt", limit: 40, region: "US" },
  { id: "BYR-MS-04", name: "Marks & Spencer", system: "g78", limit: 100, region: "UK" },
  { id: "BYR-UQ-05", name: "Uniqlo", system: "4pt", limit: 18, region: "JP" },
];

export const rollsSeed: Roll[] = [
  { id: "TX-8829", article: "100% Combed Cotton Single Jersey", gsm: 180, widthIn: 60, lengthM: 142.5, buyerId: "BYR-HM-01", lot: "LOT-2026-1142", yarnLot: "YL-30S-7781", supplier: "Square Yarns Ltd", site: "ASH-U03", line: "ASH-U03-L04", status: "inspecting", gsmMeasured: 178, widthMeasured: 59.6, bowPct: 1.2, shadeDE: 0.42, shrinkPct: 3.1 },
  { id: "TX-8828", article: "100% Combed Cotton Single Jersey", gsm: 180, widthIn: 60, lengthM: 168.0, buyerId: "BYR-HM-01", lot: "LOT-2026-1142", yarnLot: "YL-30S-7781", supplier: "Square Yarns Ltd", site: "ASH-U03", line: "ASH-U03-L04", status: "certified", gsmMeasured: 181, widthMeasured: 60.1, bowPct: 0.8, shadeDE: 0.31, shrinkPct: 2.8 },
  { id: "TX-8827", article: "CVC 60/40 Pique", gsm: 220, widthIn: 68, lengthM: 155.2, buyerId: "BYR-PV-03", lot: "LOT-2026-1139", yarnLot: "YL-CVC-2210", supplier: "Thermax Yarn", site: "ASH-U03", line: "ASH-U03-L02", status: "graded", gsmMeasured: 216, widthMeasured: 67.4, bowPct: 2.1, shadeDE: 0.66, shrinkPct: 4.2 },
  { id: "TX-8826", article: "Cotton Spandex 1x1 Rib", gsm: 240, widthIn: 52, lengthM: 98.4, buyerId: "BYR-ZR-02", lot: "LOT-2026-1137", yarnLot: "YL-CS-0942", supplier: "Akij Textile", site: "GZP-U01", line: "GZP-U01-L07", status: "graded", gsmMeasured: 238, widthMeasured: 51.8, bowPct: 1.6, shadeDE: 0.52, shrinkPct: 4.8 },
  { id: "TX-8825", article: "Polyester Interlock", gsm: 160, widthIn: 72, lengthM: 201.0, buyerId: "BYR-MS-04", lot: "LOT-2026-1131", yarnLot: "YL-PE-1180", supplier: "Bextex Fibres", site: "ASH-U03", line: "ASH-U03-L05", status: "certified", gsmMeasured: 161, widthMeasured: 71.9, bowPct: 0.5, shadeDE: 0.22, shrinkPct: 1.4 },
  { id: "TX-8824", article: "Organic Cotton Fleece", gsm: 300, widthIn: 64, lengthM: 120.6, buyerId: "BYR-UQ-05", lot: "LOT-2026-1129", yarnLot: "YL-OC-0551", supplier: "Square Yarns Ltd", site: "GZP-U01", line: "GZP-U01-L03", status: "queued", gsmMeasured: 296, widthMeasured: 63.2, bowPct: 2.8, shadeDE: 0.91, shrinkPct: 5.2 },
];

export const devicesSeed: Device[] = [
  { id: "CAM-PH-07", name: "Pixel 8 Pro · Inspector R. Hossain", kind: "Phone", location: "Line #04 · Take-down", status: "online", resolution: "4K", fps: 60, quality: 94, lastSession: "INS-2026-000418", calibrated: true },
  { id: "CAM-TB-03", name: "Galaxy Tab S9 · Inspection Table 2", kind: "Tablet", location: "QC Hall · Table 2", status: "online", resolution: "1440p", fps: 30, quality: 88, lastSession: "INS-2026-000417", calibrated: true },
  { id: "CAM-IP-12", name: "Hikvision 8MP · Batching Frame", kind: "IP Camera", location: "Finishing · Batcher A", status: "idle", resolution: "4K", fps: 25, quality: 91, lastSession: "INS-2026-000409", calibrated: true },
  { id: "CAM-US-02", name: "Basler ace USB3 · Table 1", kind: "USB Camera", location: "QC Hall · Table 1", status: "online", resolution: "5MP", fps: 75, quality: 97, lastSession: "INS-2026-000416", calibrated: true },
  { id: "CAM-WB-05", name: "Logitech Brio · Buyer Room", kind: "Webcam", location: "Buyer Office · Dhaka", status: "offline", resolution: "4K", fps: 30, quality: 72, lastSession: "INS-2026-000388", calibrated: false },
  { id: "CAM-PH-11", name: "iPhone 15 · Warehouse", kind: "Phone", location: "Greige Warehouse · Bay 3", status: "idle", resolution: "4K", fps: 60, quality: 83, lastSession: "INS-2026-000411", calibrated: false },
];

export const sessionsSeed: Session[] = [
  { id: "INS-2026-000418", rollId: "TX-8829", deviceId: "CAM-PH-07", inspector: "R. Hossain", location: "Line #04 · Take-down", site: "ASH-U03", startedAt: BASE_TS + 2 * 3600e3, status: "live", metersInspected: 142.5 },
  { id: "INS-2026-000417", rollId: "TX-8827", deviceId: "CAM-TB-03", inspector: "S. Akter", location: "QC Hall · Table 2", site: "ASH-U03", startedAt: BASE_TS + 1 * 3600e3, status: "completed", metersInspected: 155.2 },
  { id: "INS-2026-000416", rollId: "TX-8828", deviceId: "CAM-US-02", inspector: "M. Rahman", location: "QC Hall · Table 1", site: "ASH-U03", startedAt: BASE_TS, status: "completed", metersInspected: 168.0 },
  { id: "INS-2026-000412", rollId: "TX-8826", deviceId: "CAM-PH-11", inspector: "T. Islam", location: "Gazipur · Line #07", site: "GZP-U01", startedAt: BASE_TS - 5 * 3600e3, status: "completed", metersInspected: 98.4 },
  { id: "INS-2026-000409", rollId: "TX-8825", deviceId: "CAM-IP-12", inspector: "N. Chowdhury", location: "Finishing · Batcher A", site: "ASH-U03", startedAt: BASE_TS - 9 * 3600e3, status: "completed", metersInspected: 201.0 },
];

let seq = 100;
function d(
  rollId: string,
  sessionId: string,
  minutes: number,
  meter: number,
  x: number,
  cls: DefectClass,
  points: number,
  confidence: number,
  status: DefectStatus = "pending",
): Defect {
  seq += 1;
  return {
    id: `DF-000${seq}`,
    rollId,
    sessionId,
    ts: BASE_TS + 2 * 3600e3 + minutes * 60e3,
    meter,
    x,
    cls,
    points,
    confidence,
    status,
    source: "ai",
  };
}

// TX-8829: 1pt×3, 2pt×4, 3pt×1, 4pt×1 = 18 pts. Three needle lines within 15 m.
export const defectsSeed: Defect[] = [
  d("TX-8829", "INS-2026-000418", 2, 8.4, 0.22, "Slub", 1, 0.887, "confirmed"),
  d("TX-8829", "INS-2026-000418", 6, 24.1, 0.61, "Oil Stain", 2, 0.942, "confirmed"),
  d("TX-8829", "INS-2026-000418", 11, 41.7, 0.35, "Slub", 1, 0.812, "confirmed"),
  d("TX-8829", "INS-2026-000418", 17, 63.0, 0.78, "Warp Float", 3, 0.913, "confirmed"),
  d("TX-8829", "INS-2026-000418", 22, 80.6, 0.48, "Barre", 2, 0.856, "confirmed"),
  d("TX-8829", "INS-2026-000418", 28, 101.2, 0.12, "Hole", 4, 0.978, "confirmed"),
  d("TX-8829", "INS-2026-000418", 33, 118.9, 0.44, "Needle Line", 2, 0.931),
  d("TX-8829", "INS-2026-000418", 36, 126.3, 0.45, "Needle Line", 2, 0.947),
  d("TX-8829", "INS-2026-000418", 39, 133.4, 0.44, "Needle Line", 1, 0.902),
  // other rolls
  d("TX-8827", "INS-2026-000417", -50, 12.2, 0.3, "Drop Stitch", 3, 0.91, "confirmed"),
  d("TX-8827", "INS-2026-000417", -45, 40.5, 0.7, "Hole", 4, 0.96, "confirmed"),
  d("TX-8827", "INS-2026-000417", -40, 77.1, 0.2, "Oil Stain", 2, 0.88, "reclassified"),
  d("TX-8827", "INS-2026-000417", -36, 99.8, 0.55, "Slub", 1, 0.74, "dismissed"),
  d("TX-8827", "INS-2026-000417", -30, 140.0, 0.8, "Lycra Out", 4, 0.93, "confirmed"),
  d("TX-8828", "INS-2026-000416", -110, 30.0, 0.5, "Slub", 1, 0.83, "confirmed"),
  d("TX-8828", "INS-2026-000416", -100, 92.3, 0.2, "Oil Stain", 2, 0.9, "confirmed"),
  d("TX-8826", "INS-2026-000412", -400, 20.4, 0.4, "Lycra Out", 4, 0.95, "confirmed"),
  d("TX-8826", "INS-2026-000412", -390, 44.0, 0.6, "Hole", 4, 0.97, "confirmed"),
  d("TX-8826", "INS-2026-000412", -380, 71.6, 0.3, "Barre", 2, 0.86, "confirmed"),
  d("TX-8825", "INS-2026-000409", -600, 66.0, 0.5, "Slub", 1, 0.79, "confirmed"),
];

export const alertsSeed: Alert[] = [
  {
    id: "ALR-0091",
    level: "major",
    title: "Tensora Cluster Alert",
    body: "3 needle line defects detected within 15 meters on Line #04. Recommendation: Inspect Needle #142 on Cylinder Head 2 immediately.",
    ts: BASE_TS + 2 * 3600e3 + 39 * 60e3,
    location: "ASH-U03 · Line #04",
    savings: 380,
  },
  {
    id: "ALR-0090",
    level: "minor",
    title: "Capture quality degraded",
    body: "CAM-PH-11 lighting uniformity dropped to 61%. Move closer to the batching lamp or enable torch.",
    ts: BASE_TS + 1.5 * 3600e3,
    location: "Greige Warehouse · Bay 3",
  },
  {
    id: "ALR-0089",
    level: "major",
    title: "Roll TX-8826 major defect cluster",
    body: "Two 4-point Lycra Out holes and barre within 50 m. Lycra Out pattern suggests elastane feeder tension issue on GZP-U01-L07.",
    ts: BASE_TS - 6 * 3600e3,
    location: "GZP-U01 · Line #07",
    savings: 1240,
  },
  {
    id: "ALR-0088",
    level: "info",
    title: "Yarn lot YL-30S-7781 trending clean",
    body: "Slub frequency 38% below 30-day baseline across 4 rolls. Supplier scorecard updated.",
    ts: BASE_TS - 10 * 3600e3,
    location: "Supplier · Square Yarns Ltd",
  },
];

export const certificatesSeed: Certificate[] = [
  { id: "QAC-2026-0031", rollId: "TX-8828", issuedAt: BASE_TS - 1 * 3600e3, issuer: "M. Rahman", verdict: "PASS", score: 3.6 },
  { id: "QAC-2026-0030", rollId: "TX-8825", issuedAt: BASE_TS - 8 * 3600e3, issuer: "N. Chowdhury", verdict: "PASS", score: 0.4 },
];

/** 30-day quality trend — deterministic. */
export const trend30 = Array.from({ length: 30 }, (_, i) => {
  const wave = Math.sin(i / 3.2) * 3 + Math.cos(i / 5.1) * 2;
  return {
    day: `D${i + 1}`,
    score: +(13 + wave + (i % 7 === 3 ? 6 : 0)).toFixed(1),
    firstQuality: +(92 + Math.cos(i / 4) * 3 - (i % 7 === 3 ? 4 : 0)).toFixed(1),
    rolls: 38 + ((i * 7) % 13),
  };
});
