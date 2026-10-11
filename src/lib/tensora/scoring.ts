export type ScoringSystem = "4pt" | "10pt" | "g78";

export const M_TO_YD = 1.0936133;

/** ASTM D5430 4-point: points per 100 square yards. */
export function pointsPer100SqYd(points: number, lengthM: number, widthIn: number) {
  const yards = lengthM * M_TO_YD;
  if (yards <= 0 || widthIn <= 0) return 0;
  return (points * 3600) / (yards * widthIn);
}

/** 10-point: total points per linear yard × 100 (simplified as points per 100 linear yd). */
export function tenPointScore(points: number, lengthM: number) {
  const yards = lengthM * M_TO_YD;
  return yards > 0 ? (points / yards) * 100 : 0;
}

/** Graniteville 78: allowed = width ÷ 9 points per yard; returns ratio of actual vs allowed (×100). */
export function granitevilleScore(points: number, lengthM: number, widthIn: number) {
  const yards = lengthM * M_TO_YD;
  const allowed = (widthIn / 9) * yards;
  return allowed > 0 ? (points / allowed) * 100 : 0;
}

export function scoreFor(system: ScoringSystem, points: number, lengthM: number, widthIn: number) {
  if (system === "10pt") return tenPointScore(points, lengthM);
  if (system === "g78") return granitevilleScore(points, lengthM, widthIn);
  return pointsPer100SqYd(points, lengthM, widthIn);
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

export async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
