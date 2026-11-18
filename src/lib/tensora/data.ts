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
    lastSession: "INS-LIVE",
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
    lastSession: "INS-LIVE",
    calibrated: true,
    batteryPct: 88,
    streamRole: "companion_handheld",
    streamUrl: "",
    torchOn: false,
    pingMs: 22,
  },
];

export const sessionsSeed: Session[] = [];

export const defectsSeed: Defect[] = [];

export const alertsSeed: Alert[] = [];

export const certificatesSeed: Certificate[] = [];

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

