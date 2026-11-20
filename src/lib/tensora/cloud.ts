import { supabase } from "@/integrations/supabase/client";
import type { Alert, Buyer, Certificate, Defect, DefectClass, Device, Roll, Session } from "./data";
import type { ScoringSystem } from "./scoring";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = any;
const n = (v: unknown) => Number(v ?? 0);

export const toBuyer = (r: Row): Buyer => ({ id: r.id, name: r.name, system: r.system as ScoringSystem, limit: n(r.score_limit), region: r.region });
export const toRoll = (r: Row): Roll => ({
  id: r.id, article: r.article, gsm: n(r.gsm), widthIn: n(r.width_in), lengthM: n(r.length_m), buyerId: r.buyer_id, lot: r.lot,
  yarnLot: r.yarn_lot, supplier: r.supplier, site: r.site, line: r.line, status: r.status, gsmMeasured: n(r.gsm_measured),
  widthMeasured: n(r.width_measured), bowPct: n(r.bow_pct), shadeDE: n(r.shade_de), shrinkPct: n(r.shrink_pct),
  shift: r.shift || "Shift A (06:00-14:00)",
  machineNo: r.machine_no || "Circular Knit #04",
  dyeBatch: r.dye_batch || r.lot,
  yarnCount: r.yarn_count || "30/1 Ne Combed",
  fabricType: r.fabric_type || r.article,
  cuttableWidthIn: n(r.cuttable_width_in || r.width_in - 1.0),
  skewPct: n(r.skew_pct),
  gsmLeft: n(r.gsm_left || r.gsm_measured),
  gsmCenter: n(r.gsm_center || r.gsm_measured),
  gsmRight: n(r.gsm_right || r.gsm_measured),
});
export const toDevice = (r: Row): Device => ({
  id: r.id, name: r.name, kind: r.kind, location: r.location, status: r.status, resolution: r.resolution, fps: n(r.fps),
  quality: n(r.quality), lastSession: r.last_session, calibrated: !!r.calibrated,
  batteryPct: r.battery_pct != null ? n(r.battery_pct) : 100,
  streamRole: r.stream_role || "overhead_main",
  streamUrl: r.stream_url || "",
  torchOn: !!r.torch_on,
  pingMs: r.ping_ms != null ? n(r.ping_ms) : 15,
});
export const toSession = (r: Row): Session => ({
  id: r.id, rollId: r.roll_id, deviceId: r.device_id, inspector: r.inspector, location: r.location, site: r.site,
  startedAt: n(r.started_at), status: r.status, metersInspected: n(r.meters_inspected),
});
export const toDefect = (r: Row, thumb?: string): Defect => ({
  id: r.id, rollId: r.roll_id, sessionId: r.session_id, ts: n(r.ts), meter: n(r.meter), x: n(r.x), cls: r.cls as DefectClass,
  points: n(r.points), confidence: n(r.confidence), status: r.status, source: r.source,
  ...(thumb ? { thumb } : {}), ...(r.reviewer ? { reviewer: r.reviewer } : {}), ...(r.original_cls ? { originalCls: r.original_cls as DefectClass } : {}),
  zone: r.zone || "Center Panel",
  lengthIn: n(r.length_in || 1.0),
  isContinuous: !!r.is_continuous,
});
export const toAlert = (r: Row): Alert => ({
  id: r.id, level: r.level, title: r.title, body: r.body, ts: n(r.ts), location: r.location, ...(r.savings == null ? {} : { savings: n(r.savings) }),
});
export const toCert = (r: Row): Certificate => ({ id: r.id, rollId: r.roll_id, issuedAt: n(r.issued_at), issuer: r.issuer, verdict: r.verdict, score: n(r.score) });

const BUCKET = "defect-crops";

export async function signThumbs(rows: Row[]): Promise<Record<string, string>> {
  const paths = rows.map((r) => r.thumb_path).filter(Boolean) as string[];
  if (!paths.length) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60 * 6);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

export async function loadAll() {
  const [b, r, dv, s, df, a, c] = await Promise.all([
    supabase.from("buyers").select("*").order("id"),
    supabase.from("rolls").select("*").order("id", { ascending: false }),
    supabase.from("devices").select("*").order("id"),
    supabase.from("inspection_sessions").select("*").order("started_at", { ascending: false }),
    supabase.from("defects").select("*").order("ts", { ascending: false }).limit(2000),
    supabase.from("alerts").select("*").order("ts", { ascending: false }),
    supabase.from("certificates").select("*").order("issued_at", { ascending: false }),
  ]);
  const err = [b, r, dv, s, df, a, c].find((x) => x.error)?.error;
  if (err) throw new Error(err.message);
  const urls = await signThumbs(df.data ?? []);
  return {
    buyers: (b.data ?? []).map(toBuyer),
    rolls: (r.data ?? []).map(toRoll),
    devices: (dv.data ?? []).map(toDevice),
    sessions: (s.data ?? []).map(toSession),
    defects: (df.data ?? []).map((x) => toDefect(x, x.thumb_path ? urls[x.thumb_path] : undefined)),
    alerts: (a.data ?? []).map(toAlert),
    certificates: (c.data ?? []).map(toCert),
  };
}

async function dataUrlToBlob(url: string) {
  return (await fetch(url)).blob();
}

export async function insertDefect(d: Defect) {
  let thumb_path: string | null = null;
  if (d.thumb?.startsWith("data:")) {
    const path = `${d.rollId}/${d.id}.jpg`;
    const up = await supabase.storage.from(BUCKET).upload(path, await dataUrlToBlob(d.thumb), { contentType: "image/jpeg", upsert: true });
    if (!up.error) thumb_path = path;
  }
  return supabase.from("defects").insert({
    id: d.id, roll_id: d.rollId, session_id: d.sessionId, ts: d.ts, meter: d.meter, x: d.x, cls: d.cls, points: d.points,
    confidence: d.confidence, status: d.status, source: d.source, thumb_path,
    zone: d.zone || "Center Panel",
    length_in: d.lengthIn || 1.0,
    is_continuous: !!d.isContinuous,
  });
}

export function updateDefect(id: string, patch: Partial<Defect>) {
  const row: Row = {};
  if (patch.status) row.status = patch.status;
  if (patch.cls) row.cls = patch.cls;
  if (patch.points != null) row.points = patch.points;
  if (patch.reviewer) row.reviewer = patch.reviewer;
  if (patch.originalCls) row.original_cls = patch.originalCls;
  if (patch.zone) row.zone = patch.zone;
  if (patch.lengthIn != null) row.length_in = patch.lengthIn;
  if (patch.isContinuous != null) row.is_continuous = patch.isContinuous;
  return supabase.from("defects").update(row).eq("id", id);
}

export function updateBuyerRow(id: string, patch: Partial<Buyer>) {
  const row: Row = {};
  if (patch.system) row.system = patch.system;
  if (patch.limit != null) row.score_limit = patch.limit;
  if (patch.name) row.name = patch.name;
  return supabase.from("buyers").update(row).eq("id", id);
}

export function insertRoll(r: Roll) {
  return supabase.from("rolls").insert({
    id: r.id,
    article: r.article,
    gsm: r.gsm,
    width_in: r.widthIn,
    length_m: r.lengthM,
    buyer_id: r.buyerId,
    lot: r.lot,
    yarn_lot: r.yarnLot,
    supplier: r.supplier,
    site: r.site,
    line: r.line,
    status: r.status,
    gsm_measured: r.gsmMeasured,
    width_measured: r.widthMeasured,
    bow_pct: r.bowPct,
    shade_de: r.shadeDE,
    shrink_pct: r.shrinkPct,
    shift: r.shift || "Shift A (06:00-14:00)",
    machine_no: r.machineNo || "Circular Knit #04",
    dye_batch: r.dyeBatch || r.lot,
    yarn_count: r.yarnCount || "30/1 Ne Combed",
    fabric_type: r.fabricType || r.article,
    cuttable_width_in: r.cuttableWidthIn || (r.widthIn - 1.0),
    skew_pct: r.skewPct || 0,
    gsm_left: r.gsmLeft || r.gsmMeasured,
    gsm_center: r.gsmCenter || r.gsmMeasured,
    gsm_right: r.gsmRight || r.gsmMeasured,
  });
}

export function upsertDevice(d: Device) {
  return supabase.from("devices").upsert({
    id: d.id,
    name: d.name,
    kind: d.kind,
    location: d.location,
    status: d.status,
    resolution: d.resolution,
    fps: d.fps,
    quality: d.quality,
    last_session: d.lastSession,
    calibrated: d.calibrated,
    battery_pct: d.batteryPct ?? 100,
    stream_role: d.streamRole || "overhead_main",
    stream_url: d.streamUrl || "",
    torch_on: !!d.torchOn,
    ping_ms: d.pingMs ?? 15,
  });
}

export function insertSession(s: Session) {
  return supabase.from("inspection_sessions").insert({
    id: s.id,
    roll_id: s.rollId,
    device_id: s.deviceId,
    inspector: s.inspector,
    location: s.location,
    site: s.site,
    started_at: s.startedAt,
    status: s.status,
    meters_inspected: s.metersInspected,
  });
}

export function insertCertificate(c: Certificate) {
  return supabase.from("certificates").insert({ id: c.id, roll_id: c.rollId, issued_at: c.issuedAt, issuer: c.issuer, verdict: c.verdict, score: c.score });
}

export function setRollStatus(id: string, status: Roll["status"]) {
  return supabase.from("rolls").update({ status }).eq("id", id);
}

export function deleteAlert(id: string) {
  return supabase.from("alerts").delete().eq("id", id);
}

export function saveProgress(rollId: string, lengthM: number, sessionId: string, meters: number) {
  return Promise.all([
    supabase.from("rolls").update({ length_m: lengthM }).eq("id", rollId),
    supabase.from("inspection_sessions").update({ meters_inspected: meters }).eq("id", sessionId),
  ]);
}

export async function loadMe(userId: string) {
  try {
    const [p, r, authRes] = await Promise.all([
      supabase.from("profiles").select("display_name, email").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.auth.getUser().catch(() => ({ data: { user: null } })),
    ]);
    const authUser = authRes?.data?.user;
    const email = p.data?.email || authUser?.email || "";
    const name = p.data?.display_name || authUser?.user_metadata?.full_name || (email ? email.split("@")[0] : "Inspector");
    const roles = (r.data ?? []).map((x) => x.role);
    return {
      name,
      email,
      roles: roles.length ? roles : ["plant_admin"],
    };
  } catch {
    return { name: "Plant Inspector", email: "", roles: ["plant_admin"] };
  }
}

export function newId(prefix: string) {
  const t = Date.now().toString(36).toUpperCase();
  const rnd = Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0");
  return `${prefix}-${t}${rnd}`;
}
