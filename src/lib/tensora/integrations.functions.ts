import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Kind = "sap" | "fastreact" | "generic";

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPayload(kind: Kind, cert: any, roll: any, buyer: any, defectCount: number) {
  const pass = cert.verdict === "PASS";
  const base = {
    event: "roll.certified",
    certificateId: cert.id,
    rollId: roll.id,
    verdict: cert.verdict,
    score: Number(cert.score),
    issuedAt: new Date(Number(cert.issued_at)).toISOString(),
  };
  if (kind === "sap") {
    // Shaped like an S/4HANA QM usage decision for an inspection lot/batch.
    return {
      ...base,
      InspectionLot: { Material: roll.article, Batch: roll.id, Plant: roll.site, BuyerId: buyer?.id ?? roll.buyer_id },
      UsageDecision: { Code: pass ? "A" : "R", CodeGroup: "TENSORA", Valuation: pass ? "Accepted" : "Rejected", QualityScore: Number(cert.score), Defects: defectCount, CertificateRef: cert.id },
      StockPosting: pass ? "UNRESTRICTED" : "BLOCKED",
    };
  }
  if (kind === "fastreact") {
    return {
      ...base,
      fabricRoll: { rollNo: roll.id, lot: roll.lot, article: roll.article, lengthM: Number(roll.length_m), widthIn: Number(roll.width_in), gsm: Number(roll.gsm_measured || roll.gsm) },
      quality: { status: pass ? "RELEASED" : "ON_HOLD", grade: pass ? "A" : "REJECT", pointsPer100: Number(cert.score), standard: buyer?.system ?? "4pt", limit: Number(buyer?.score_limit ?? 24), defects: defectCount },
      customer: buyer?.name ?? roll.buyer_id,
    };
  }
  return { ...base, roll, buyer, defects: defectCount };
}

async function deliver(endpoint: { id: string; kind: string; url: string; secret: string }, payload: object, event: string, certId?: string, rollId?: string) {
  const body = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000).toString();
  let status: number | null = null, ok = false, error: string | null = null;
  try {
    const sig = await hmacHex(endpoint.secret, `${ts}.${body}`);
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tensora-Event": event, "X-Tensora-Timestamp": ts, "X-Tensora-Signature": `sha256=${sig}` },
      body,
      signal: AbortSignal.timeout(10000),
    });
    status = res.status; ok = res.ok;
    if (!ok) error = (await res.text()).slice(0, 500);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("integration_deliveries").insert({ endpoint_id: endpoint.id, event, cert_id: certId ?? null, roll_id: rollId ?? null, status_code: status, ok, error, payload: payload as never });
  return { ok, status, error };
}

/** Sends a certified roll to every enabled ERP/MES endpoint. */
export const dispatchCertified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ certId: z.string().min(1).max(40) }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_any_role", { _user_id: context.userId, _roles: ["quality_manager", "plant_admin"] });
    if (!allowed) throw new Error("Forbidden");
    const { data: cert } = await context.supabase.from("certificates").select("*").eq("id", data.certId).maybeSingle();
    if (!cert) throw new Error("Certificate not found");
    const { data: roll } = await context.supabase.from("rolls").select("*").eq("id", cert.roll_id).maybeSingle();
    if (!roll) throw new Error("Roll not found");
    const [{ data: buyer }, { count }] = await Promise.all([
      context.supabase.from("buyers").select("*").eq("id", roll.buyer_id).maybeSingle(),
      context.supabase.from("defects").select("id", { count: "exact", head: true }).eq("roll_id", roll.id).neq("status", "dismissed"),
    ]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: eps } = await supabaseAdmin.from("integration_endpoints").select("*").eq("enabled", true);
    const results = await Promise.all((eps ?? []).map(async (ep) => ({ name: ep.name, ...(await deliver(ep, buildPayload(ep.kind as Kind, cert, roll, buyer, count ?? 0), "roll.certified", cert.id, roll.id)) })));
    return { sent: results.length, failed: results.filter((r) => !r.ok).map((r) => r.name) };
  });

/** Admin-only test ping to one endpoint. */
export const testEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    // RLS limits this read to Plant Admins.
    const { data: ep } = await context.supabase.from("integration_endpoints").select("*").eq("id", data.id).maybeSingle();
    if (!ep) throw new Error("Forbidden");
    const sample = { cert: { id: "QAC-TEST-0000", verdict: "PASS", score: 12.4, issued_at: Date.now() }, roll: { id: "TX-TEST", article: "Test Jersey", site: "ASH-U03", lot: "L-TEST", buyer_id: "BYR-TEST", length_m: 100, width_in: 60, gsm: 180 } };
    return deliver(ep, { test: true, ...buildPayload(ep.kind as Kind, sample.cert, sample.roll, null, 0) }, "test.ping");
  });
