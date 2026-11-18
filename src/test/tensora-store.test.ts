import { describe, expect, it } from "vitest";
import { useTensora, rollStats } from "@/lib/tensora/store";
import type { Roll } from "@/lib/tensora/data";

describe("Tensora Store & Dynamic Features", () => {
  it("allows registering and inspecting newly added rolls without crashing", () => {
    const newRoll: Roll = {
      id: "TX-TEST-9999",
      article: "Organic Cotton Rib",
      gsm: 210,
      widthIn: 64,
      lengthM: 125.5,
      buyerId: "BYR-HM-01",
      lot: "LOT-TEST-99",
      yarnLot: "YL-TEST-88",
      supplier: "Square Yarns Ltd",
      site: "ASH-U03",
      line: "ASH-U03-L04",
      status: "inspecting",
      gsmMeasured: 210,
      widthMeasured: 63.8,
      bowPct: 1.0,
      shadeDE: 0.3,
      shrinkPct: 2.8,
    };

    useTensora.getState().addRoll(newRoll);

    const rolls = useTensora.getState().rolls;
    expect(rolls.some((r) => r.id === "TX-TEST-9999")).toBe(true);
    expect(useTensora.getState().activeRollId).toBe("TX-TEST-9999");

    // rollStats handles newly added roll cleanly
    const stats = rollStats(useTensora.getState(), "TX-TEST-9999");
    expect(stats.roll.id).toBe("TX-TEST-9999");
    expect(stats.buyer.id).toBe("BYR-HM-01");
    expect(stats.pass).toBe(true);
  });

  it("handles live device pairing and updating camera fleet", () => {
    const pairId = "CAM-TEST-PHONE-42";
    useTensora.getState().pairDevice(pairId, {
      name: "Field Inspection Phone",
      kind: "Phone",
      location: "Line #02 · Ashulia",
      status: "online",
    });

    const devices = useTensora.getState().devices;
    const paired = devices.find((d) => d.id === pairId);
    expect(paired).toBeDefined();
    expect(paired?.status).toBe("online");
    expect(useTensora.getState().selectedDeviceId).toBe(pairId);
  });

  it("updates capture telemetry dynamically", () => {
    useTensora.getState().updateCaptureTelemetry({
      lighting: 94,
      focus: 91,
      tip: "Sharp focal plane locked",
    });

    const telem = useTensora.getState().captureTelemetry;
    expect(telem.lighting).toBe(94);
    expect(telem.focus).toBe(91);
    expect(telem.tip).toBe("Sharp focal plane locked");
  });

  it("updates recipes and creates an audit log entry", () => {
    const initialLogsCount = useTensora.getState().auditLogs.length;
    useTensora.getState().updateRecipe("rcp-1", { sensitivity: 85 });

    const updatedRecipe = useTensora.getState().recipes.find((r) => r.id === "rcp-1");
    expect(updatedRecipe?.sensitivity).toBe(85);
    expect(useTensora.getState().auditLogs.length).toBeGreaterThan(initialLogsCount);
  });

  it("safely handles rollStats fallback when roll does not exist", () => {
    const fallbackStats = rollStats(useTensora.getState(), "NON-EXISTENT-ROLL-000");
    expect(fallbackStats.roll).toBeDefined();
    expect(fallbackStats.buyer).toBeDefined();
    expect(typeof fallbackStats.score).toBe("number");
  });
});
