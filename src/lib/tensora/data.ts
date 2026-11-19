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

export type DefectZone = "Left Selvage" | "Left Panel" | "Center Panel" | "Right Panel" | "Right Selvage";

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
  zone?: DefectZone;
  lengthIn?: number;
  isContinuous?: boolean;
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
  // Bangladeshi RMG & Export QA tracking fields
  shift?: string;
  machineNo?: string;
  dyeBatch?: string;
  yarnCount?: string;
  fabricType?: string;
  cuttableWidthIn?: number;
  skewPct?: number;
  gsmLeft?: number;
  gsmCenter?: number;
  gsmRight?: number;
}

export type DeviceStreamRole = "overhead_main" | "backlight_sensor" | "companion_handheld" | "ip_rtsp";

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
  batteryPct?: number;
  streamRole?: DeviceStreamRole;
  streamUrl?: string;
  torchOn?: boolean;
  pingMs?: number;
}

export const BD_SHIFTS = [
  "Shift A (06:00-14:00)",
  "Shift B (14:00-22:00)",
  "Shift C (22:00-06:00)",
] as const;

export const BD_FABRIC_TYPES = [
  "100% Combed Cotton Single Jersey",
  "CVC 60/40 Single Jersey",
  "1x1 Cotton Spandex Rib",
  "2x2 Lycra Rib",
  "CVC 60/40 Pique",
  "Cotton French Terry",
  "Fleece 300 GSM",
  "Polyester Interlock",
] as const;

export const BD_YARN_COUNTS = [
  "30/1 Ne Combed Compact Ring Spun",
  "26/1 Ne Carded Ring Spun",
  "34/1 Ne Combed + 20D Spandex",
  "40/1 Ne Micro-Modal / Combed Cotton",
  "20/1 Ne Open-End Cotton",
] as const;

export const DEFECT_ZONES: DefectZone[] = [
  "Left Selvage",
  "Left Panel",
  "Center Panel",
  "Right Panel",
  "Right Selvage",
];

export const DEFECT_TRANSLATIONS_BN: Record<DefectClass, { bn: string; desc: string }> = {
  "Needle Line": { bn: "নিডেল দাগ (Needle Line)", desc: "ভাঙা বা বাঁকা নিডেলের কারণে কাপড়ে লম্বালম্বি দাগ" },
  "Oil Stain": { bn: "তেলের দাগ (Oil Stain)", desc: "মেশিন বা লুব্রিক্যান্ট থেকে কাপড়ে তেলের ছোপ" },
  "Hole": { bn: "সুতার ছিদ্র (Hole)", desc: "সুতা ছিঁড়ে কাপড়ে ফাঁকা বা ফুটো তৈরি" },
  "Drop Stitch": { bn: "ড্রপ স্টিচ (Drop Stitch)", desc: "লুপ ছুটে গিয়ে সৃষ্ট ফাঁক" },
  "Slub": { bn: "মোটা সুতা / স্ল্যাব (Slub)", desc: "সুতার মাঝে অতিরিক্ত মোটা বা অনিয়মিত অংশ" },
  "Barre": { bn: "টানা দাগ / বারে (Barre)", desc: "সুতার টেনশন বা ভিন্ন লটের কারণে রঙের আড়াআড়ি দাগ" },
  "Fly Yarn": { bn: "উড়ন্ত সুতা (Fly Yarn)", desc: "বাতাসের আলগা ফাইবার কাপড়ে আটকে যাওয়া" },
  "Warp Float": { bn: "সুতার ফ্লোট (Warp Float)", desc: "ইন্টারলেস ছাড়া সুতার অনিচ্ছাকৃত ভাসমানতা" },
};

export const BD_SHIFTS_BN: Record<string, string> = {
  "Shift A (06:00-14:00)": "শিফট ক (সকাল ০৬:০০ - দুপুর ০২:০০)",
  "Shift B (14:00-22:00)": "শিফট খ (দুপুর ০২:০০ - রাত ১০:০০)",
  "Shift C (22:00-06:00)": "শিফট গ (রাত ১০:০০ - সকাল ০৬:০০)",
};

export const DEVICE_STREAM_ROLES: { id: DeviceStreamRole; label: string; desc: string }[] = [
  { id: "overhead_main", label: "Overhead Table Main", desc: "Top-down inspection for surface slubs, barre & oil stains" },
  { id: "backlight_sensor", label: "Backlight Transillumination", desc: "Bottom-up LED panel for pinholes, drop stitches & thick/thin spots" },
  { id: "companion_handheld", label: "Companion Handheld Scanner", desc: "Inspector mobile device for close-up edge, bow & selvage scrutiny" },
  { id: "ip_rtsp", label: "Industrial IP/RTSP Stream", desc: "High-speed line camera mounted to take-down or batcher roller" },
];

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
  {
    id: "TX-8829",
    article: "100% Combed Cotton Single Jersey",
    gsm: 180,
    widthIn: 60,
    lengthM: 142.5,
    buyerId: "BYR-HM-01",
    lot: "LOT-2026-1142",
    yarnLot: "YL-30S-7781",
    supplier: "Square Yarns Ltd",
    site: "ASH-U03",
    line: "ASH-U03-L04",
    status: "inspecting",
    gsmMeasured: 178,
    widthMeasured: 59.6,
    bowPct: 1.2,
    shadeDE: 0.42,
    shrinkPct: 3.1,
    shift: "Shift A (06:00-14:00)",
    machineNo: "Mayer & Cie #14 (Cylinder 30\")",
    dyeBatch: "DYE-2026-8801",
    yarnCount: "30/1 Ne Combed Compact Ring Spun",
    fabricType: "100% Combed Cotton Single Jersey",
    cuttableWidthIn: 59.0,
    skewPct: 0.8,
    gsmLeft: 178.0,
    gsmCenter: 177.5,
    gsmRight: 178.5,
  },
  {
    id: "TX-8828",
    article: "100% Combed Cotton Single Jersey",
    gsm: 180,
    widthIn: 60,
    lengthM: 168.0,
    buyerId: "BYR-HM-01",
    lot: "LOT-2026-1142",
    yarnLot: "YL-30S-7781",
    supplier: "Square Yarns Ltd",
    site: "ASH-U03",
    line: "ASH-U03-L04",
    status: "certified",
    gsmMeasured: 181,
    widthMeasured: 60.1,
    bowPct: 0.8,
    shadeDE: 0.31,
    shrinkPct: 2.8,
    shift: "Shift A (06:00-14:00)",
    machineNo: "Mayer & Cie #14 (Cylinder 30\")",
    dyeBatch: "DYE-2026-8802",
    yarnCount: "30/1 Ne Combed Compact Ring Spun",
    fabricType: "100% Combed Cotton Single Jersey",
    cuttableWidthIn: 59.1,
    skewPct: 0.7,
    gsmLeft: 181.0,
    gsmCenter: 180.5,
    gsmRight: 181.5,
  },
  {
    id: "TX-8827",
    article: "CVC 60/40 Pique",
    gsm: 220,
    widthIn: 68,
    lengthM: 155.2,
    buyerId: "BYR-PV-03",
    lot: "LOT-2026-1139",
    yarnLot: "YL-CVC-2210",
    supplier: "Thermax Yarn",
    site: "ASH-U03",
    line: "ASH-U03-L02",
    status: "graded",
    gsmMeasured: 216,
    widthMeasured: 67.4,
    bowPct: 2.1,
    shadeDE: 0.66,
    shrinkPct: 4.2,
    shift: "Shift B (14:00-22:00)",
    machineNo: "Terrot Rib-Circular #08",
    dyeBatch: "DYE-2026-8798",
    yarnCount: "26/1 Ne Carded Ring Spun",
    fabricType: "CVC 60/40 Pique",
    cuttableWidthIn: 67.0,
    skewPct: 1.4,
    gsmLeft: 215.0,
    gsmCenter: 217.0,
    gsmRight: 216.0,
  },
  {
    id: "TX-8826",
    article: "Cotton Spandex 1x1 Rib",
    gsm: 240,
    widthIn: 52,
    lengthM: 98.4,
    buyerId: "BYR-ZR-02",
    lot: "LOT-2026-1137",
    yarnLot: "YL-CS-0942",
    supplier: "Akij Textile",
    site: "GZP-U01",
    line: "GZP-U01-L07",
    status: "graded",
    gsmMeasured: 238,
    widthMeasured: 51.8,
    bowPct: 1.6,
    shadeDE: 0.52,
    shrinkPct: 4.8,
    shift: "Shift C (22:00-06:00)",
    machineNo: "Fukuhara Interlock #02",
    dyeBatch: "DYE-2026-8785",
    yarnCount: "34/1 Ne Combed + 20D Spandex",
    fabricType: "1x1 Cotton Spandex Rib",
    cuttableWidthIn: 51.0,
    skewPct: 1.2,
    gsmLeft: 237.0,
    gsmCenter: 239.0,
    gsmRight: 238.0,
  },
  {
    id: "TX-8825",
    article: "Polyester Interlock",
    gsm: 160,
    widthIn: 72,
    lengthM: 201.0,
    buyerId: "BYR-MS-04",
    lot: "LOT-2026-1131",
    yarnLot: "YL-PE-1180",
    supplier: "Bextex Fibres",
    site: "ASH-U03",
    line: "ASH-U03-L05",
    status: "certified",
    gsmMeasured: 161,
    widthMeasured: 71.9,
    bowPct: 0.5,
    shadeDE: 0.22,
    shrinkPct: 1.4,
    shift: "Shift A (06:00-14:00)",
    machineNo: "Orizio Flat #01",
    dyeBatch: "DYE-2026-8772",
    yarnCount: "40/1 Ne Micro-Modal / Combed Cotton",
    fabricType: "Polyester Interlock",
    cuttableWidthIn: 71.0,
    skewPct: 0.4,
    gsmLeft: 161.0,
    gsmCenter: 160.5,
    gsmRight: 161.5,
  },
  {
    id: "TX-8824",
    article: "Organic Cotton Fleece",
    gsm: 300,
    widthIn: 64,
    lengthM: 120.6,
    buyerId: "BYR-UQ-05",
    lot: "LOT-2026-1129",
    yarnLot: "YL-OC-0551",
    supplier: "Square Yarns Ltd",
    site: "GZP-U01",
    line: "GZP-U01-L03",
    status: "queued",
    gsmMeasured: 296,
    widthMeasured: 63.2,
    bowPct: 2.8,
    shadeDE: 0.91,
    shrinkPct: 5.2,
    shift: "Shift B (14:00-22:00)",
    machineNo: "Pailung Fleece #06",
    dyeBatch: "DYE-2026-8760",
    yarnCount: "20/1 Ne Open-End Cotton",
    fabricType: "Fleece 300 GSM",
    cuttableWidthIn: 63.0,
    skewPct: 1.8,
    gsmLeft: 295.0,
    gsmCenter: 297.0,
    gsmRight: 296.0,
  },
  {
    id: "TX-1001",
    article: "100% Combed Cotton Single Jersey",
    gsm: 180,
    widthIn: 60,
    lengthM: 100.0,
    buyerId: "BYR-HM-01",
    lot: "LOT-2026-0001",
    yarnLot: "YL-30S-0001",
    supplier: "Square Yarns Ltd",
    site: "ASH-U03",
    line: "ASH-U03-L04",
    status: "inspecting",
    gsmMeasured: 180,
    widthMeasured: 60.0,
    bowPct: 0.8,
    shadeDE: 0.3,
    shrinkPct: 2.8,
    shift: "Shift A (06:00-14:00)",
    machineNo: "Mayer & Cie #14 (Cylinder 30\")",
    dyeBatch: "DYE-2026-8802",
    yarnCount: "30/1 Ne Combed Compact Ring Spun",
    fabricType: "100% Combed Cotton Single Jersey",
    cuttableWidthIn: 59.0,
    skewPct: 0.8,
    gsmLeft: 180.0,
    gsmCenter: 179.5,
    gsmRight: 180.5,
  },
];

export const devicesSeed: Device[] = [
  {
    id: "CAM-01",
    name: "Inspection Table Camera",
    kind: "USB Camera",
    location: "QC Hall · Table 1",
    status: "online",
    resolution: "1080p",
    fps: 60,
    quality: 95,
    lastSession: "INS-2026-000418",
    calibrated: true,
    batteryPct: 100,
    streamRole: "overhead_main",
    streamUrl: "",
    torchOn: false,
    pingMs: 14,
  },
  {
    id: "CAM-MOB-02",
    name: "Inspector Companion Tablet",
    kind: "Tablet",
    location: "QC Hall · Floor Rover",
    status: "online",
    resolution: "1440p",
    fps: 60,
    quality: 92,
    lastSession: "INS-2026-000412",
    calibrated: true,
    batteryPct: 88,
    streamRole: "companion_handheld",
    streamUrl: "",
    torchOn: false,
    pingMs: 22,
  },
  {
    id: "CAM-PH-07",
    name: "Pixel 8 Pro · Inspector R. Hossain",
    kind: "Phone",
    location: "Line #04 · Take-down",
    status: "online",
    resolution: "4K",
    fps: 60,
    quality: 94,
    lastSession: "INS-2026-000418",
    calibrated: true,
    batteryPct: 91,
    streamRole: "overhead_main",
    streamUrl: "",
    torchOn: false,
    pingMs: 18,
  },
  {
    id: "CAM-BK-03",
    name: "Stenter Backlight Transillumination",
    kind: "USB Camera",
    location: "Stenter Exit · Unit 03",
    status: "online",
    resolution: "1080p",
    fps: 60,
    quality: 98,
    lastSession: "INS-2026-000416",
    calibrated: true,
    batteryPct: 100,
    streamRole: "backlight_sensor",
    streamUrl: "",
    torchOn: true,
    pingMs: 8,
  },
  {
    id: "CAM-IP-12",
    name: "High-Speed Line Scanner",
    kind: "IP Camera",
    location: "Finishing · Batcher A",
    status: "online",
    resolution: "4K",
    fps: 120,
    quality: 96,
    lastSession: "INS-2026-000409",
    calibrated: true,
    batteryPct: 100,
    streamRole: "ip_rtsp",
    streamUrl: "",
    torchOn: false,
    pingMs: 11,
  },
];

export const sessionsSeed: Session[] = [
  {
    id: "INS-2026-000418",
    rollId: "TX-8829",
    deviceId: "CAM-01",
    inspector: "R. Hossain",
    location: "QC Hall · Table 1",
    site: "ASH-U03",
    startedAt: BASE_TS + 2 * 3600e3,
    status: "live",
    metersInspected: 142.5,
  },
  {
    id: "INS-2026-000417",
    rollId: "TX-8827",
    deviceId: "CAM-01",
    inspector: "S. Akter",
    location: "QC Hall · Table 2",
    site: "ASH-U03",
    startedAt: BASE_TS + 1 * 3600e3,
    status: "completed",
    metersInspected: 155.2,
  },
  {
    id: "INS-2026-000416",
    rollId: "TX-8828",
    deviceId: "CAM-BK-03",
    inspector: "M. Rahman",
    location: "QC Hall · Table 1",
    site: "ASH-U03",
    startedAt: BASE_TS,
    status: "completed",
    metersInspected: 168.0,
  },
  {
    id: "INS-2026-000412",
    rollId: "TX-8826",
    deviceId: "CAM-MOB-02",
    inspector: "T. Islam",
    location: "Gazipur · Line #07",
    site: "GZP-U01",
    startedAt: BASE_TS - 5 * 3600e3,
    status: "completed",
    metersInspected: 98.4,
  },
  {
    id: "INS-2026-000409",
    rollId: "TX-8825",
    deviceId: "CAM-IP-12",
    inspector: "N. Chowdhury",
    location: "Finishing · Batcher A",
    site: "ASH-U03",
    startedAt: BASE_TS - 9 * 3600e3,
    status: "completed",
    metersInspected: 201.0,
  },
];

export const DEFECT_THUMBS: Record<DefectClass, string> = {
  "Needle Line": "/textiles/needle_line.jpg",
  "Oil Stain": "/textiles/oil_stain.jpg",
  "Hole": "/textiles/fabric_hole.jpg",
  "Warp Float": "/textiles/yarn_float.jpg",
  "Drop Stitch": "/textiles/drop_stitch.jpg",
  "Slub": "/textiles/yarn_slub.jpg",
  "Barre": "/textiles/knit_barre.jpg",
  "Lycra Out": "/textiles/lycra_out.jpg",
};

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
  zone?: DefectZone,
  lengthIn = 1.0,
  isContinuous = false,
  thumb?: string,
): Defect {
  seq += 1;
  const computedZone: DefectZone =
    zone ?? (x <= 0.08 ? "Left Selvage" : x <= 0.35 ? "Left Panel" : x <= 0.65 ? "Center Panel" : x <= 0.92 ? "Right Panel" : "Right Selvage");
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
    thumb: thumb ?? DEFECT_THUMBS[cls],
    zone: computedZone,
    lengthIn,
    isContinuous,
  };
}

// Rich defect ledger for instant inspection, triage, and ASTM/BD scoring
export const defectsSeed: Defect[] = [
  d("TX-8829", "INS-2026-000418", 2, 8.4, 0.22, "Slub", 1, 0.887, "confirmed", "Left Panel", 0.8),
  d("TX-8829", "INS-2026-000418", 6, 24.1, 0.61, "Oil Stain", 2, 0.942, "confirmed", "Right Panel", 1.5),
  d("TX-8829", "INS-2026-000418", 11, 41.7, 0.35, "Slub", 1, 0.812, "confirmed", "Left Panel", 0.6),
  d("TX-8829", "INS-2026-000418", 17, 63.0, 0.78, "Warp Float", 3, 0.913, "confirmed", "Right Panel", 2.2),
  d("TX-8829", "INS-2026-000418", 22, 80.6, 0.48, "Barre", 2, 0.856, "confirmed", "Center Panel", 1.8),
  d("TX-8829", "INS-2026-000418", 28, 101.2, 0.12, "Hole", 4, 0.978, "confirmed", "Left Panel", 0.4),
  d("TX-8829", "INS-2026-000418", 33, 118.9, 0.44, "Needle Line", 2, 0.931, "pending", "Center Panel", 1.2),
  d("TX-8829", "INS-2026-000418", 36, 126.3, 0.45, "Needle Line", 2, 0.947, "pending", "Center Panel", 1.4),
  d("TX-8829", "INS-2026-000418", 39, 133.4, 0.44, "Needle Line", 1, 0.902, "pending", "Center Panel", 0.9),
  // TX-8827
  d("TX-8827", "INS-2026-000417", -50, 12.2, 0.3, "Drop Stitch", 3, 0.91, "confirmed", "Left Panel", 1.5),
  d("TX-8827", "INS-2026-000417", -45, 40.5, 0.7, "Hole", 4, 0.96, "confirmed", "Right Panel", 0.5),
  d("TX-8827", "INS-2026-000417", -40, 77.1, 0.2, "Oil Stain", 2, 0.88, "reclassified", "Left Panel", 1.0),
  d("TX-8827", "INS-2026-000417", -36, 99.8, 0.55, "Slub", 1, 0.74, "dismissed", "Center Panel", 0.7),
  // TX-8828
  d("TX-8828", "INS-2026-000416", -110, 30.0, 0.5, "Slub", 1, 0.83, "confirmed", "Center Panel", 0.5),
  d("TX-8828", "INS-2026-000416", -100, 92.3, 0.2, "Oil Stain", 2, 0.9, "confirmed", "Left Panel", 1.2),
  // TX-8826
  d("TX-8826", "INS-2026-000412", -400, 20.4, 0.05, "Oil Stain", 2, 0.95, "confirmed", "Left Selvage", 1.0),
  d("TX-8826", "INS-2026-000412", -390, 44.0, 0.6, "Hole", 4, 0.97, "confirmed", "Right Panel", 0.6),
  d("TX-8826", "INS-2026-000412", -380, 71.6, 0.3, "Barre", 2, 0.86, "confirmed", "Left Panel", 2.0),
  // TX-8825
  d("TX-8825", "INS-2026-000409", -600, 66.0, 0.5, "Slub", 1, 0.79, "confirmed", "Center Panel", 0.6),
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
    body: "CAM-MOB-02 lighting uniformity dropped to 61%. Move closer to the batching lamp or enable torch.",
    ts: BASE_TS + 1.5 * 3600e3,
    location: "Greige Warehouse · Bay 3",
  },
  {
    id: "ALR-0089",
    level: "major",
    title: "Roll TX-8826 exceeds Zara limit",
    body: "Score 29.7 pts/100 yd² vs. limit 20.0. Lycra Out pattern suggests elastane feeder tension issue on GZP-U01-L07.",
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
  {
    id: "QAC-2026-0032",
    rollId: "TX-8829",
    issuedAt: BASE_TS + 2.5 * 3600e3,
    issuer: "R. Hossain (Lead Inspector)",
    verdict: "PASS",
    score: 12.8,
  },
  {
    id: "QAC-2026-0031",
    rollId: "TX-8828",
    issuedAt: BASE_TS - 1 * 3600e3,
    issuer: "M. Rahman (QC In-charge)",
    verdict: "PASS",
    score: 3.6,
  },
  {
    id: "QAC-2026-0030",
    rollId: "TX-8825",
    issuedAt: BASE_TS - 8 * 3600e3,
    issuer: "N. Chowdhury (Senior Auditor)",
    verdict: "PASS",
    score: 0.4,
  },
  {
    id: "QAC-2026-0029",
    rollId: "TX-8826",
    issuedAt: BASE_TS - 5 * 3600e3,
    issuer: "T. Islam (Lead Inspector)",
    verdict: "REJECT",
    score: 29.7,
  },
  {
    id: "QAC-2026-0028",
    rollId: "TX-8827",
    issuedAt: BASE_TS - 2 * 3600e3,
    issuer: "S. Akter (Plant Inspector)",
    verdict: "PASS",
    score: 21.4,
  },
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

export interface Recipe {
  id: string;
  name: string;
  sensitivity: number;
  minConfidence: number;
}

export const defaultRecipes: Recipe[] = [
  { id: "rcp-1", name: "Single Jersey 180 GSM", sensitivity: 72, minConfidence: 0.7 },
  { id: "rcp-2", name: "CVC Pique 220 GSM", sensitivity: 65, minConfidence: 0.75 },
  { id: "rcp-3", name: "Cotton Spandex Rib", sensitivity: 80, minConfidence: 0.65 },
  { id: "rcp-4", name: "Polyester Interlock", sensitivity: 58, minConfidence: 0.8 },
  { id: "rcp-5", name: "Organic Fleece 300 GSM", sensitivity: 70, minConfidence: 0.7 },
];

export interface TaxonomySetting {
  cls: DefectClass;
  points: number;
  enabled: boolean;
}

export const defaultTaxonomy: TaxonomySetting[] = DEFECT_CLASSES.map((c) => ({
  cls: c,
  points: DEFAULT_POINTS[c],
  enabled: true,
}));

export interface SiteSetting {
  id: string;
  name: string;
  lines: string;
}

export const defaultSites: SiteSetting[] = [
  { id: "ASH-U03", name: "Ashulia Mill — Unit 03", lines: "Line #02, #04, #05 · QC Hall · Finishing · Warehouse" },
  { id: "GZP-U01", name: "Gazipur Mill — Unit 01", lines: "Line #03, #07 · QC Hall" },
  { id: "DHK-BO", name: "Buyer Office — Dhaka", lines: "Audit room" },
];

export interface AuditEntry {
  id: string;
  ts: number;
  actor: string;
  action: string;
}

export const defaultAuditLogs: AuditEntry[] = [
  { id: "aud-1", ts: BASE_TS + 3600e3 * 3, actor: "M. Rahman", action: "Buyer standard BYR-ZR-02 limit changed 22 → 20" },
  { id: "aud-2", ts: BASE_TS + 3600e3 * 2, actor: "T. Islam", action: "Device CAM-PH-11 paired at Greige Warehouse" },
  { id: "aud-3", ts: BASE_TS + 3600e3 * 1, actor: "S. Akter", action: "Recipe 'Cotton Spandex Rib' sensitivity 75 → 80" },
  { id: "aud-4", ts: BASE_TS, actor: "M. Rahman", action: "Certificate QAC-2026-0031 issued" },
  { id: "aud-5", ts: BASE_TS - 3600e3, actor: "Plant Admin", action: "User T. Islam role set to Field Inspector" },
];

