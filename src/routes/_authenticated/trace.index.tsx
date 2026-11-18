import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FileSpreadsheet, Plus, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, Tag } from "@/components/tensora/ui";
import { useTensora, rollStats } from "@/lib/tensora/store";
import { checkContinuousFault } from "@/lib/tensora/scoring";

export const Route = createFileRoute("/_authenticated/trace/")({
  head: () => ({
    meta: [
      { title: "Tensora Trace — Roll Register · Araneid" },
      { name: "description", content: "Roll and lot traceability from yarn lot to buyer PO, with inspection history from every location." },
      { property: "og:title", content: "Tensora Trace — Araneid" },
      { property: "og:description", content: "Roll and lot traceability across every inspection." },
    ],
  }),
  component: TracePage,
});

function TracePage() {
  const state = useTensora();
  const [q, setQ] = useState("");
  const rolls = state.rolls.filter((r) =>
    `${r.id} ${r.article} ${r.lot} ${r.machineNo || ""} ${r.shift || ""} ${r.dyeBatch || ""}`.toLowerCase().includes(q.toLowerCase())
  );

  const exportMillCsv = () => {
    if (state.rolls.length === 0) {
      toast.error("No rolls available to export");
      return;
    }

    const headers = [
      "Roll ID",
      "Shift",
      "Machine / Cylinder No",
      "Dye Batch / Lot",
      "Yarn Count",
      "Fabric Type",
      "Gross Width (in)",
      "Cuttable Width (in)",
      "Length (m)",
      "Target GSM",
      "Left GSM",
      "Center GSM",
      "Right GSM",
      "Average GSM",
      "Bow %",
      "Skew %",
      "Defects Count",
      "Penalty Points",
      "4-Point Score",
      "Buyer",
      "Grade",
      "Verdict",
      "Continuous Fault",
      "Supplier",
      "Site",
      "Line",
      "Inspection Status",
    ];

    const rows = state.rolls.map((r) => {
      const s = rollStats(state, r.id);
      const defects = state.defects.filter((d) => d.rollId === r.id);
      const cf = checkContinuousFault(defects);
      const cuttableW = r.cuttableWidthIn ?? (r.widthIn - 1.0);
      const avgGsm = r.gsmMeasured || Math.round(((r.gsmLeft ?? r.gsm) + (r.gsmCenter ?? r.gsm) + (r.gsmRight ?? r.gsm)) / 3);

      return [
        `"${r.id}"`,
        `"${r.shift || "Shift A"}"`,
        `"${r.machineNo || "Line #04"}"`,
        `"${r.dyeBatch || r.lot}"`,
        `"${r.yarnCount || "30/1 Ne Combed"}"`,
        `"${r.fabricType || r.article}"`,
        r.widthIn,
        cuttableW,
        r.lengthM.toFixed(1),
        r.gsm,
        r.gsmLeft ?? r.gsm,
        r.gsmCenter ?? r.gsm,
        r.gsmRight ?? r.gsm,
        avgGsm,
        r.bowPct,
        r.skewPct ?? 1.2,
        defects.length,
        s.points,
        s.score.toFixed(2),
        `"${s.buyer.name}"`,
        `"${cf.hasContinuousFault ? "REJECT" : s.pass ? "Grade A" : "Grade B"}"`,
        `"${s.pass && !cf.hasContinuousFault ? "PASS" : "REJECT"}"`,
        `"${cf.hasContinuousFault ? `HOLD (${cf.streakMeters}m)` : "NONE"}"`,
        `"${r.supplier}"`,
        `"${r.site}"`,
        `"${r.line}"`,
        `"${r.status}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tensora_mill_roll_register_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${state.rolls.length} rolls to ERP CSV spreadsheet`);
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <PageHeader
        module="Tensora Trace"
        title="Roll & Lot Register (Bangladeshi RMG Mill Fleet)"
        description="End-to-end fabric roll traceability from spinning yarn count to knitting cylinder, 3-point GSM, and buyer certificate."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 h-9 text-xs" onClick={exportMillCsv}>
              <Download className="h-4 w-4" /> Export Mill CSV
            </Button>
            <Button asChild className="gap-2 h-9 text-xs">
              <Link to="/capture" search={{ tab: "setup" }}>
                <Plus className="h-4 w-4" /> New Roll Ticket
              </Link>
            </Button>
          </div>
        }
      />

      <Panel
        title={`${rolls.length} Registered Rolls`}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search roll, lot, shift, machine..."
                className="h-8 w-60 pl-8 text-xs"
              />
            </div>
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {rolls.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No rolls matching search filter.
            </div>
          ) : (
            rolls.map((r) => {
              const s = rollStats(state, r.id);
              const defects = state.defects.filter((d) => d.rollId === r.id);
              const cf = checkContinuousFault(defects);
              const cuttableW = r.cuttableWidthIn ?? (r.widthIn - 1.0);

              return (
                <Link
                  key={r.id}
                  to="/trace/$rollId"
                  params={{ rollId: r.id }}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 hover:bg-accent/30 md:grid-cols-[1.2fr_1.6fr_1.2fr_1.2fr_auto] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-primary">{r.id}</span>
                      {cf.hasContinuousFault && (
                        <span className="inline-flex items-center gap-1 rounded bg-major/20 px-1.5 py-0.5 text-[10px] font-bold text-major">
                          <ShieldAlert className="h-3 w-3" /> HOLD
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground mt-0.5">
                      {r.shift || "Shift A"} · {r.machineNo || "Line #04"}
                    </div>
                  </div>

                  <div className="hidden min-w-0 md:block">
                    <div className="truncate text-sm font-medium">{r.article}</div>
                    <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                      Target {r.gsm} GSM (L:{r.gsmLeft ?? r.gsm} C:{r.gsmCenter ?? r.gsm} R:{r.gsmRight ?? r.gsm}) · {r.lengthM.toFixed(1)} m
                    </div>
                  </div>

                  <div className="hidden font-mono text-xs md:block">
                    <div>Gross {r.widthIn}" · <b className="text-foreground">{cuttableW}" Cuttable</b></div>
                    <div className="text-muted-foreground text-[11px]">Lot: {r.dyeBatch || r.lot}</div>
                  </div>

                  <div className="hidden text-xs md:block">
                    <div className="font-medium">{s.buyer.name}</div>
                    <div className="font-mono text-muted-foreground text-[11px]">
                      {s.score.toFixed(1)} / {s.buyer.limit} pts ({s.points} pts)
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Tag tone={s.pass && !cf.hasContinuousFault ? "pass" : "major"}>
                      {s.pass && !cf.hasContinuousFault ? "Pass" : "Reject"}
                    </Tag>
                    <Tag>{r.status}</Tag>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </Panel>
    </div>
  );
}
