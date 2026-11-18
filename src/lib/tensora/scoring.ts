export type ScoringSystem = "4pt" | "10pt" | "g78";

export const M_TO_YD = 1.0936133;

/** ASTM D5430 4-point: points per 100 square yards based on fabric width (or cuttable width if specified). */
export function pointsPer100SqYd(points: number, lengthM: number, widthIn: number, cuttableWidthIn?: number) {
  const yards = lengthM * M_TO_YD;
  // Use cuttable width if explicitly provided (e.g. Bangladesh RMG cuttable width), otherwise gross width
  const effWidth = cuttableWidthIn !== undefined ? cuttableWidthIn : widthIn;
  if (yards <= 0 || effWidth <= 0) return 0;
  return Number(((points * 3600) / (yards * effWidth)).toFixed(3));
}

/** 10-point: total points per linear yard × 100 (points per 100 linear yd). */
export function tenPointScore(points: number, lengthM: number) {
  const yards = lengthM * M_TO_YD;
  return yards > 0 ? Number(((points / yards) * 100).toFixed(2)) : 0;
}

/** Graniteville 78: allowed = width ÷ 9 points per yard; returns percentage of allowance. */
export function granitevilleScore(points: number, lengthM: number, widthIn: number) {
  const yards = lengthM * M_TO_YD;
  const allowed = (widthIn / 9) * yards;
  return allowed > 0 ? Number(((points / allowed) * 100).toFixed(3)) : 0;
}

export function scoreFor(system: ScoringSystem, points: number, lengthM: number, widthIn: number, cuttableWidthIn?: number) {
  if (system === "10pt") return tenPointScore(points, lengthM);
  if (system === "g78") return granitevilleScore(points, lengthM, widthIn);
  return pointsPer100SqYd(points, lengthM, widthIn, cuttableWidthIn);
}

export const systemLabel: Record<ScoringSystem, string> = {
  "4pt": "4-Point · ASTM D5430",
  "10pt": "10-Point System",
  g78: "Graniteville 78",
};

export const systemUnit: Record<ScoringSystem, string> = {
  "4pt": "pts / 100 yd²",
  "10pt": "pts / 100 yd",
  g78: "% of allowance",
};

export function severityTone(points: number): "minor" | "major" {
  return points >= 3 ? "major" : "minor";
}

export function gradeFor(score: number, limit: number): "A" | "B" | "REJECT" {
  if (score <= limit * 0.6) return "A";
  if (score <= limit) return "B";
  return "REJECT";
}

// -----------------------------------------------------------------------------
// Bangladeshi RMG (Ready Made Garments) QA Standards & Physical Tolerances
// ASTM D5430, ASTM D3776 (GSM), ASTM D3882 (Bow/Skew), ISO 16322 (Spirality)
// -----------------------------------------------------------------------------

export type DefectZone = "Left Selvage" | "Left Panel" | "Center Panel" | "Right Panel" | "Right Selvage";

/** Determines the garment cutting zone based on normalized 0..1 position across roll width */
export function getSpatialZone(x: number): DefectZone {
  if (x < 0.10) return "Left Selvage";
  if (x < 0.35) return "Left Panel";
  if (x <= 0.65) return "Center Panel";
  if (x <= 0.90) return "Right Panel";
  return "Right Selvage";
}

export interface ContinuousFaultResult {
  hasContinuousFault: boolean;
  streakMeters: number;
  offendingClass?: string;
  advice?: string;
}

/**
 * Continuous fault check (Bangladesh RMG ASTM D5430 standard):
 * A repetitive running fault (like needle lines, drop stitch, or barre) running across >3 meters
 * is an automatic rejection / quality hold in circular knitting mills.
 */
export function checkContinuousFault(defects: { meter: number; cls: string; status?: string }[]): ContinuousFaultResult {
  const active = defects.filter((d) => d.status !== "dismissed").sort((a, b) => a.meter - b.meter);
  const byClass = new Map<string, number[]>();

  for (const d of active) {
    const list = byClass.get(d.cls) ?? [];
    list.push(d.meter);
    byClass.set(d.cls, list);
  }

  for (const [cls, meters] of byClass.entries()) {
    if (meters.length < 3) continue;
    for (let i = 0; i <= meters.length - 3; i++) {
      const mEnd = meters[i + 2];
      const mStart = meters[i];
      if (mEnd === undefined || mStart === undefined) continue;
      const span = mEnd - mStart;
      if (span <= 5.0) { // 3 occurrences within 5 meters
        return {
          hasContinuousFault: true,
          streakMeters: Number(span.toFixed(1)),
          offendingClass: cls,
          advice: `Continuous ${cls} detected over ${span.toFixed(1)}m. Inspect needle dial/cylinder immediately to prevent bulk knitting damage.`,
        };
      }
    }
  }

  return { hasContinuousFault: false, streakMeters: 0 };
}

export interface GsmComplianceResult {
  passed: boolean;
  avgMeasured: number;
  nominalGsm: number;
  diffPct: number;
  edgeCenterVariancePct: number;
  status: "pass" | "warning" | "reject";
  description: string;
}

/**
 * GSM 3-Point verification (ASTM D3776 / Bangladesh Knitwear Protocol):
 * Standard allows ±5% from nominal PO weight. Edge-to-center difference must be ≤3%.
 */
export function checkGsmCompliance(
  nominalGsm: number,
  measured: { left?: number; center?: number; right?: number } | number,
  tolerancePct = 5
): GsmComplianceResult {
  let left = nominalGsm;
  let center = nominalGsm;
  let right = nominalGsm;

  if (typeof measured === "number") {
    left = measured;
    center = measured;
    right = measured;
  } else {
    left = measured.left ?? nominalGsm;
    center = measured.center ?? nominalGsm;
    right = measured.right ?? nominalGsm;
  }

  const avg = Number(((left + center + right) / 3).toFixed(1));
  const diffPct = nominalGsm > 0 ? Number((((avg - nominalGsm) / nominalGsm) * 100).toFixed(1)) : 0;
  const edgeCenterVariancePct = center > 0 ? Number(((Math.abs(left - center) + Math.abs(right - center)) / (2 * center) * 100).toFixed(1)) : 0;

  const passed = Math.abs(diffPct) <= tolerancePct && edgeCenterVariancePct <= 4.0;
  const status: "pass" | "warning" | "reject" =
    Math.abs(diffPct) <= tolerancePct && edgeCenterVariancePct <= 3.0
      ? "pass"
      : Math.abs(diffPct) <= tolerancePct + 2
      ? "warning"
      : "reject";

  let description = `GSM is within ±${tolerancePct}% PO tolerance (${diffPct > 0 ? "+" : ""}${diffPct}%).`;
  if (edgeCenterVariancePct > 3.0) {
    description += ` Note: ${edgeCenterVariancePct}% edge-to-center shading variance detected across width.`;
  }

  return {
    passed,
    avgMeasured: avg,
    nominalGsm,
    diffPct,
    edgeCenterVariancePct,
    status,
    description,
  };
}

export interface BowSkewResult {
  passed: boolean;
  bowPct: number;
  skewPct: number;
  spiralityRisk: "low" | "moderate" | "high";
  description: string;
}

/**
 * Bowing & Skewing / Spirality (ASTM D3882 / ISO 16322 for Bangladesh RMG):
 * Maximum allowable bow: ≤2.0% (plain knits) or ≤1.5% (yarn-dyed stripes).
 * Maximum allowable skew/torque: ≤2.5% (prevents twisted side seams after washing).
 */
export function checkBowAndSkew(bowPct: number, skewPct: number, isYarnDyedOrStripe = false): BowSkewResult {
  const maxBow = isYarnDyedOrStripe ? 1.5 : 2.5;
  const maxSkew = 2.5;

  const bowPassed = bowPct <= maxBow;
  const skewPassed = skewPct <= maxSkew;
  const passed = bowPassed && skewPassed;

  let spiralityRisk: "low" | "moderate" | "high" = "low";
  if (skewPct > 3.0) spiralityRisk = "high";
  else if (skewPct > 2.0) spiralityRisk = "moderate";

  let description = "Fabric geometry within standard knitting/stentering tolerances.";
  if (spiralityRisk === "high") {
    description = "Critical Spirality Risk (>3.0% skew): Knitted garments will twist after domestic washing.";
  } else if (!bowPassed) {
    description = `Bow exceeds ${maxBow}% limit. Heat-setting stenter correction recommended.`;
  }

  return {
    passed,
    bowPct,
    skewPct,
    spiralityRisk,
    description,
  };
}

export async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
