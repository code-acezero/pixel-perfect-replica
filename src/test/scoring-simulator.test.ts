import { describe, expect, it } from "vitest";
import {
  M_TO_YD,
  gradeFor,
  granitevilleScore,
  pointsPer100SqYd,
  scoreFor,
  tenPointScore,
} from "../lib/tensora/scoring";

describe("Textile Quality Scoring Math", () => {
  it("computes ASTM D5430 4-point score per 100 square yards accurately", () => {
    // 18 penalty points, 120m length, 58 inch width
    const score = pointsPer100SqYd(18, 120, 58);
    // yards = 120 * 1.0936133 = 131.233596
    // (18 * 3600) / (131.233596 * 58) = 64800 / 7611.548568 = 8.51338
    expect(score).toBeCloseTo(8.513, 2);
  });

  it("computes 10-point linear yard score accurately", () => {
    const score = tenPointScore(24, 120);
    // (24 / (120 * 1.0936133)) * 100 = (24 / 131.233596) * 100 = 18.288
    expect(score).toBeCloseTo(18.288, 2);
  });

  it("computes Graniteville 78 loom allowance ratio correctly", () => {
    const score = granitevilleScore(15, 120, 58);
    // yards = 120 * 1.0936133 = 131.2336
    // allowed = (58 / 9) * 131.2336 = 845.727
    // ratio = (15 / 845.727) * 100 = 1.7736%
    expect(score).toBeCloseTo(1.774, 2);
  });

  it("evaluates grades deterministically against buyer limit thresholds", () => {
    const limit = 20;
    // Grade A: <= 0.6 * 20 = 12.0
    expect(gradeFor(10.5, limit)).toBe("A");
    expect(gradeFor(12.0, limit)).toBe("A");

    // Grade B: > 12.0 and <= 20.0
    expect(gradeFor(12.1, limit)).toBe("B");
    expect(gradeFor(19.9, limit)).toBe("B");
    expect(gradeFor(20.0, limit)).toBe("B");

    // Reject: > 20.0
    expect(gradeFor(20.1, limit)).toBe("REJECT");
    expect(gradeFor(35.0, limit)).toBe("REJECT");
  });

  it("supports unified scoreFor dispatch across all three systems", () => {
    expect(scoreFor("4pt", 18, 120, 58)).toBeCloseTo(8.513, 2);
    expect(scoreFor("10pt", 24, 120, 58)).toBeCloseTo(18.288, 2);
    expect(scoreFor("g78", 15, 120, 58)).toBeCloseTo(1.774, 2);
  });
});
