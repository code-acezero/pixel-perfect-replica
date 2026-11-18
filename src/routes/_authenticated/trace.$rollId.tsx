import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AlertOctagon, AlertTriangle, CheckCircle2, ChevronLeft, FileBadge, Info, Layers, Scissors, ShieldAlert, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Tag, VerdictBadge, fmtDateTime } from "@/components/tensora/ui";
import { RollMap } from "@/components/tensora/roll-map";
import { DefectLedger } from "@/components/tensora/defect-ledger";
import { RollTicketModal } from "@/components/tensora/roll-ticket";
import { useTensora, rollStats } from "@/lib/tensora/store";
import { rollsSeed, DEFECT_ZONES, type DefectZone } from "@/lib/tensora/data";
import { systemUnit, gradeFor, checkContinuousFault, checkGsmCompliance, checkBowAndSkew } from "@/lib/tensora/scoring";
import { tabSearch } from "@/lib/tensora/search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/trace/$rollId")({
  validateSearch: tabSearch,
  loader: ({ params }) => {
    const rolls = useTensora.getState().rolls;
    const exists = rolls.some((r) => r.id === params.rollId) || rollsSeed.some((r) => r.id === params.rollId);
    if (!exists) throw notFound();
    return { rollId: params.rollId };
  },
  head: ({ params }) => ({
    meta: [
      { title: `Roll ${params.rollId} — Tensora Trace` },
      { name: "description", content: `Inspection summary, roll map, tests and genealogy for roll ${params.rollId}.` },
      { property: "og:title", content: `Roll ${params.rollId} — Tensora Trace` },
      { property: "og:description", content: `Traceability record for roll ${params.rollId}.` },
    ],
  }),
  notFoundComponent: () => <div className="p-10 text-center text-muted-foreground">Roll not found. <Link to="/trace" className="text-primary">Back to register</Link></div>,
  errorComponent: ({ error }) => <div className="p-10 text-center text-major">{(error as Error).message}</div>,
  component: RollDetail,
});

function RollDetail() {
  const { rollId } = Route.useParams();
  const { tab = "summary" } = Route.useSearch();
  const navigate = useNavigate({ from: "/trace/$rollId" });
  const state = useTensora();
  const s = rollStats(state, rollId);
  const { roll, buyer } = s;
  const all = state.defects.filter((d) => d.rollId === rollId);
  const sessions = state.sessions.filter((x) => x.rollId === rollId);
  const grade = gradeFor(s.score, buyer.limit);

  // Bangladeshi RMG & ASTM QA Compliance checks
  const continuousFault = checkContinuousFault(all);
  const gsmCheck = checkGsmCompliance(roll.gsm, {
    left: roll.gsmLeft ?? roll.gsmMeasured ?? roll.gsm,
    center: roll.gsmCenter ?? roll.gsmMeasured ?? roll.gsm,
    right: roll.gsmRight ?? roll.gsmMeasured ?? roll.gsm,
  });
  const bowSkewCheck = checkBowAndSkew(roll.bowPct, roll.skewPct ?? 1.2);

  // Defect spatial zone breakdown
  const zoneCounts: Record<DefectZone, number> = {
    "Left Selvage": 0,
    "Left Panel": 0,
    "Center Panel": 0,
    "Right Panel": 0,
    "Right Selvage": 0,
  };
  for (const d of all) {
    const z = (d.zone as DefectZone) || "Center Panel";
    if (zoneCounts[z] !== undefined) {
      zoneCounts[z]++;
    } else {
      zoneCounts["Center Panel"]++;
    }
  }
  const selvageCount = zoneCounts["Left Selvage"] + zoneCounts["Right Selvage"];
  const bodyCount = all.length - selvageCount;
  const cuttableW = roll.cuttableWidthIn ?? (roll.widthIn - 1.0);

  return (
    <div className="mx-auto max-w-[1600px]">
      <Link to="/trace" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Roll register
      </Link>
      <PageHeader
        module="Tensora Trace"
        title={`Roll #${roll.id}`}
        description={`${roll.article} · ${roll.gsm} GSM · ${roll.shift || "Shift A"} · ${buyer.name}`}
        actions={
          <div className="flex items-center gap-2">
            <RollTicketModal roll={roll} buyer={buyer} score={s.score} pass={s.pass && !continuousFault.hasContinuousFault} />
            <Button asChild className="gap-2">
              <Link to="/certify" search={{ roll: roll.id }}>
                <FileBadge className="h-4 w-4" /> Certify roll
              </Link>
            </Button>
          </div>
        }
      />
      <Tabs value={tab} onValueChange={(t) => navigate({ search: { tab: t } })}>
        <div className="mb-4 overflow-x-auto">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="map">Roll Map & Cut Plan</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="tests">Secondary Tests (ASTM & BD Specs)</TabsTrigger>
            <TabsTrigger value="genealogy">Genealogy</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary" className="space-y-4">
          {/* Critical Continuous Streak Alert Banner */}
          {continuousFault.hasContinuousFault && (
            <div className="flex items-center gap-3 rounded-lg border border-major/60 bg-major/20 p-4 text-sm text-major shadow-md">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-bold uppercase tracking-wider text-xs">
                  Automatic Mill Hold (ASTM D5430 / Bangladesh RMG Standard)
                </div>
                <div className="mt-1">
                  Continuous <b>{continuousFault.offendingClass}</b> detected spanning <b>{continuousFault.streakMeters.toFixed(1)}m</b> (&gt; 3.0m allowable limit). {continuousFault.advice}
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="ASTM D5430 Verdict">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-4xl font-bold">{s.score.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">{systemUnit[buyer.system]} (limit {buyer.limit})</span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                Cuttable width basis: <b className="text-foreground">{cuttableW}"</b> ({roll.widthIn}" gross)
              </div>
              <div className="mt-3 flex items-center gap-2">
                <VerdictBadge pass={s.pass && !continuousFault.hasContinuousFault} />
                <span className="text-sm font-medium">Grade <span className="font-mono font-bold">{continuousFault.hasContinuousFault ? "REJECT" : grade}</span></span>
              </div>
              <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Repeat streak:</span>
                  <span className={cn("font-medium", continuousFault.hasContinuousFault ? "text-major" : "text-pass")}>
                    {continuousFault.hasContinuousFault ? `FAIL (${continuousFault.streakMeters}m)` : "PASS (Clean)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">3-Pt GSM variance:</span>
                  <span className={cn("font-medium", gsmCheck.passed ? "text-pass" : "text-minor")}>
                    {gsmCheck.passed ? "PASS (±5%)" : "OUT OF TOLERANCE"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Spirality / Skew:</span>
                  <span className={cn("font-medium", bowSkewCheck.passed ? "text-pass" : "text-minor")}>
                    {bowSkewCheck.skewPct}% ({bowSkewCheck.spiralityRisk.toUpperCase()})
                  </span>
                </div>
              </div>
            </Panel>

            <Panel title="Bangladeshi RMG Factory Genealogy & Specs" className="lg:col-span-2">
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {[
                  ["Length", `${roll.lengthM.toFixed(1)} m`],
                  ["Gross Width", `${roll.widthIn} in`],
                  ["Cuttable Width", `${cuttableW} in`],
                  ["Penalty Points", `${s.points} pts`],
                  ["Defects Count", all.length],
                  ["Shift", roll.shift || "Shift A (06:00-14:00)"],
                  ["Machine / Cylinder", roll.machineNo || "Line #04"],
                  ["Dye Batch / Lot", roll.dyeBatch || roll.lot],
                  ["Yarn Count", roll.yarnCount || "30/1 Ne Combed"],
                  ["Fabric Type", roll.fabricType || "Single Jersey"],
                  ["Supplier", roll.supplier || "Square Yarns Ltd"],
                  ["Site / Line", `${roll.site} · ${roll.line}`],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <dt className="label-caps">{k}</dt>
                    <dd className="mt-0.5 font-mono text-xs truncate" title={String(v)}>{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </div>

          {/* Spatial Defect Distribution (Selvage vs Cuttable Body) */}
          <Panel title="Defect Spatial Distribution Across Fabric Width">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Cross-width zoning (5 zones): <b>{bodyCount} body defects</b> ({all.length > 0 ? Math.round((bodyCount / all.length) * 100) : 0}%) vs <b>{selvageCount} edge/selvage defects</b> ({all.length > 0 ? Math.round((selvageCount / all.length) * 100) : 0}%)
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  1.0" edge waste zone deducted
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center text-xs font-mono">
                {DEFECT_ZONES.map((zone) => {
                  const cnt = zoneCounts[zone];
                  const isEdge = zone === "Left Selvage" || zone === "Right Selvage";
                  return (
                    <div
                      key={zone}
                      className={cn(
                        "rounded-lg border p-2.5 transition-all",
                        isEdge ? "border-amber-500/30 bg-amber-500/5" : "border-primary/30 bg-primary/5"
                      )}
                    >
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{zone}</div>
                      <div className={cn("text-lg font-bold mt-1", cnt > 0 ? (isEdge ? "text-amber-400" : "text-primary") : "text-muted-foreground")}>
                        {cnt}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">
                        {all.length > 0 ? `${Math.round((cnt / all.length) * 100)}%` : "0%"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          <Panel title="Roll map"><RollMap defects={all} lengthM={roll.lengthM} /></Panel>
          <Panel title="Defects"><DefectLedger defects={all} /></Panel>
        </TabsContent>

        <TabsContent value="map">
          <Panel title="Roll map & suggested cut plan"><RollMap defects={all} lengthM={roll.lengthM} showCuts /></Panel>
        </TabsContent>

        <TabsContent value="sessions">
          <Panel title="Inspections of this roll" bodyClassName="p-0">
            {sessions.length === 0 && <div className="p-6 text-sm text-muted-foreground">No sessions yet.</div>}
            {sessions.map((x) => (
              <div key={x.id} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <span className="font-mono text-sm text-primary">{x.id}</span>
                <span className="text-sm">{x.location}</span>
                <span className="text-xs text-muted-foreground">{x.inspector} · {x.deviceId}</span>
                <span className="ml-auto font-mono text-xs">{fmtDateTime(x.startedAt)}</span>
                <Tag tone={x.status === "live" ? "major" : "default"}>{x.status}</Tag>
              </div>
            ))}
          </Panel>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          {/* ASTM D3776 3-Point GSM Cut Uniformity */}
          <Panel title="3-Point GSM Cut Verification (ASTM D3776 / BD Knitwear Protocol)">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="label-caps">Left Edge GSM</div>
                <div className="mt-1 font-mono text-2xl font-bold">{roll.gsmLeft ?? roll.gsmMeasured ?? roll.gsm}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Sample #1 (Outer left)</div>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="label-caps">Center Panel GSM</div>
                <div className="mt-1 font-mono text-2xl font-bold text-primary">{roll.gsmCenter ?? roll.gsmMeasured ?? roll.gsm}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Sample #2 (Width center)</div>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="label-caps">Right Edge GSM</div>
                <div className="mt-1 font-mono text-2xl font-bold">{roll.gsmRight ?? roll.gsmMeasured ?? roll.gsm}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Sample #3 (Outer right)</div>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="label-caps">Average vs Target</div>
                <div className={cn("mt-1 font-mono text-2xl font-bold", gsmCheck.passed ? "text-pass" : "text-major")}>
                  {gsmCheck.avgMeasured} <span className="text-sm font-normal text-muted-foreground">/ {gsmCheck.nominalGsm}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Δ {gsmCheck.diffPct > 0 ? `+${gsmCheck.diffPct}` : gsmCheck.diffPct}% (edge variance {gsmCheck.edgeCenterVariancePct}%)
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {gsmCheck.description} Standard allows ±5% deviation from purchase order specifications and ≤3% edge-to-center variance across the stenter width.
            </p>
          </Panel>

          {/* Secondary Physical Tests Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Panel title="Width & Cuttable Margin">
              <div className="font-mono text-2xl font-bold text-pass">{cuttableW} in</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Gross {roll.widthIn}" · Selvage deduction 1.0"
              </div>
            </Panel>
            <Panel title="Bowing & Skew / Spirality">
              <div className={cn("font-mono text-2xl font-bold", bowSkewCheck.passed ? "text-pass" : "text-major")}>
                {roll.skewPct ?? 1.2}%
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Bow {roll.bowPct}% · Risk: <b className="uppercase">{bowSkewCheck.spiralityRisk}</b>
              </div>
            </Panel>
            <Panel title="Color Shade ΔE (D65)">
              <div className={cn("font-mono text-2xl font-bold", roll.shadeDE <= 0.8 ? "text-pass" : "text-major")}>
                {roll.shadeDE}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Tolerance: max 0.8 ΔE</div>
            </Panel>
            <Panel title="Dimensional Shrinkage">
              <div className={cn("font-mono text-2xl font-bold", roll.shrinkPct <= 5 ? "text-pass" : "text-major")}>
                {roll.shrinkPct}%
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Washing cycle: max 5%</div>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="genealogy">
          <Panel title="Material Genealogy (Spinning → Circular Knitting → Stenter → Triage → Packing)">
            <ol className="flex flex-col gap-2 md:flex-row md:items-stretch">
              {[
                ["Yarn Spinning", roll.yarnLot, `${roll.supplier} (${roll.yarnCount || "30/1 Ne"})`],
                ["Circular Knitting", roll.machineNo || "Line #04", `Shift: ${roll.shift || "Shift A"}`],
                ["Dyeing & Batch", roll.dyeBatch || roll.lot, "Ashulia Dye House · Unit 03"],
                ["Stenter & Finish", `${roll.widthIn}" Gross / ${cuttableW}" Cuttable`, `Bow: ${roll.bowPct}% · Skew: ${roll.skewPct ?? 1.2}%`],
                ["Optical Inspection", sessions[0]?.id ?? "Live Session", sessions[0]?.deviceId ?? "CAM-01 Overhead"],
                ["Buyer PO / Cert", buyer.id, buyer.name],
              ].map(([k, v, sub], i) => (
                <li key={k} className="flex-1 rounded-md border border-border bg-surface-2 p-3">
                  <div className="label-caps">{i + 1} · {k}</div>
                  <div className="mt-1 font-mono text-sm text-primary truncate" title={v}>{v}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate" title={sub}>{sub}</div>
                </li>
              ))}
            </ol>
          </Panel>
        </TabsContent>

        <TabsContent value="audit">
          <Panel title="Cryptographic & Inspection Audit Trail" bodyClassName="p-0">
            {all.filter((d) => d.status !== "pending").map((d) => (
              <div key={d.id} className="flex flex-wrap gap-x-3 border-b border-border px-4 py-2 font-mono text-xs last:border-0">
                <span className="text-muted-foreground">{fmtDateTime(d.ts)}</span>
                <span>{d.id}</span>
                <span className="text-primary">{d.status.toUpperCase()}</span>
                <span>{d.cls}{d.originalCls ? ` (was ${d.originalCls})` : ""}</span>
                <span className="text-muted-foreground">zone: {d.zone || "Center"}</span>
                <span className="text-muted-foreground">by {d.reviewer ?? "QC Lead"}</span>
              </div>
            ))}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
