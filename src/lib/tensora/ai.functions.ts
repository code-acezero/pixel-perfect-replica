import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFECT_CLASSES } from "./data";
import { AiError, responsesJSON } from "./ai.server";

export interface FrameDefect {
  cls: (typeof DEFECT_CLASSES)[number];
  points: number;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface FrameResult {
  fabricVisible: boolean;
  defects: FrameDefect[];
  lighting: number;
  focus: number;
  tip: string;
  error?: string;
}

const frameSchema = {
  type: "object",
  additionalProperties: false,
  required: ["fabricVisible", "defects", "lighting", "focus", "tip"],
  properties: {
    fabricVisible: { type: "boolean" },
    lighting: { type: "number", description: "0-100 lighting quality" },
    focus: { type: "number", description: "0-100 sharpness" },
    tip: { type: "string", description: "One short capture tip for the inspector, or empty" },
    defects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["cls", "points", "confidence", "x", "y", "w", "h"],
        properties: {
          cls: { type: "string", enum: DEFECT_CLASSES },
          points: { type: "integer", description: "ASTM D5430 4-point penalty 1-4" },
          confidence: { type: "number", description: "0-1" },
          x: { type: "number", description: "box center x, 0-1 of image width" },
          y: { type: "number", description: "box top y, 0-1 of image height" },
          w: { type: "number", description: "box width, 0-1" },
          h: { type: "number", description: "box height, 0-1" },
        },
      },
    },
  },
};

const DETECT_PROMPT = `You are Tensora Vision, a textile fabric inspection model used by QC inspectors with a handheld camera.
Inspect the image for knit/woven fabric defects. Only report defects you can actually see; if the fabric looks clean, return an empty list. If no fabric is visible, set fabricVisible=false and return no defects.
Classes: ${DEFECT_CLASSES.join(", ")}. Score with the ASTM D5430 4-point system: up to 3in = 1, 3-6in = 2, 6-9in = 3, over 9in or any hole = 4.
Also rate lighting and focus 0-100 and give one short practical capture tip (e.g. "Move closer", "Add light", "Hold steady") or an empty string.`;

export const analyzeFrame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ image: z.string().startsWith("data:image/").max(2_500_000) }).parse(d))
  .handler(async ({ data, context }): Promise<FrameResult> => {
    try {
      // Few-shot reference library: up to 2 recent verified examples per class.
      const refs: Record<string, unknown>[] = [];
      const ex = await context.supabase.from("training_examples").select("cls, points, image_path").order("created_at", { ascending: false }).limit(60);
      const picked: { cls: string; points: number; image_path: string }[] = [];
      const per: Record<string, number> = {};
      for (const e of ex.data ?? []) {
        if ((per[e.cls] ?? 0) >= 2 || picked.length >= 10) continue;
        per[e.cls] = (per[e.cls] ?? 0) + 1;
        picked.push(e);
      }
      if (picked.length) {
        const signed = await context.supabase.storage.from("defect-crops").createSignedUrls(picked.map((p) => p.image_path), 300);
        refs.push({ type: "input_text", text: "Reference examples of verified defects from this plant's real knit fabric (learn their look, do not report them):" });
        picked.forEach((p, i) => {
          const url = signed.data?.[i]?.signedUrl;
          if (!url) return;
          refs.push({ type: "input_text", text: `Example: ${p.cls}, ${p.points} pt` });
          refs.push({ type: "input_image", image_url: url });
        });
      }
      const r = await responsesJSON<FrameResult>({
        instructions: DETECT_PROMPT,
        content: [
          ...refs,
          { type: "input_text", text: "Now inspect this new fabric frame and report only defects in it." },
          { type: "input_image", image_url: data.image },
        ],
        schemaName: "fabric_frame",
        schema: frameSchema,
      });
      r.defects = r.defects
        .filter((d) => d.confidence >= 0.5)
        .map((d) => {
          // Guard against pixel coordinates on the 768x432 frame.
          const nx = (v: number, size: number) => (v > 1 ? v / size : v);
          return { ...d, x: nx(d.x, 768), y: nx(d.y, 432), w: nx(d.w, 768), h: nx(d.h, 432), points: Math.min(4, Math.max(1, Math.round(d.points))) };
        });
      return r;
    } catch (e) {
      console.error("analyzeFrame", e);
      return { fabricVisible: false, defects: [], lighting: 0, focus: 0, tip: "", error: e instanceof AiError ? e.message : "Vision service unavailable" };
    }
  });

export interface RollReport {
  headline: string;
  summary: string;
  rootCauses: string[];
  actions: string[];
  buyerNote: string;
  error?: string;
}

const reportSchema = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "summary", "rootCauses", "actions", "buyerNote"],
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    rootCauses: { type: "array", items: { type: "string" } },
    actions: { type: "array", items: { type: "string" } },
    buyerNote: { type: "string" },
  },
};

export const writeRollReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rollId: z.string().min(1).max(40), score: z.number(), limit: z.number(), system: z.string() }).parse(d))
  .handler(async ({ data, context }): Promise<RollReport> => {
    const sb = context.supabase;
    const [roll, defects] = await Promise.all([
      sb.from("rolls").select("*").eq("id", data.rollId).maybeSingle(),
      sb.from("defects").select("meter, x, cls, points, status, source, confidence").eq("roll_id", data.rollId).neq("status", "dismissed").order("meter"),
    ]);
    if (!roll.data) return { headline: "", summary: "", rootCauses: [], actions: [], buyerNote: "", error: "Roll not found" };
    try {
      return await responsesJSON<RollReport>({
        instructions:
          "You are a senior textile QA engineer writing a concise, factual inspection report for a fabric roll. Use only the data given. Be specific about meter positions and defect clusters. Keep the summary under 90 words, 2-4 root causes and 2-4 actions, and a one-sentence buyer note.",
        content: [{ type: "input_text", text: JSON.stringify({ roll: roll.data, scoringSystem: data.system, score: data.score, passLimit: data.limit, defects: defects.data ?? [] }) }],
        schemaName: "roll_report",
        schema: reportSchema,
        effort: "medium",
      });
    } catch (e) {
      console.error("writeRollReport", e);
      return { headline: "", summary: "", rootCauses: [], actions: [], buyerNote: "", error: e instanceof AiError ? e.message : "Report service unavailable" };
    }
  });
