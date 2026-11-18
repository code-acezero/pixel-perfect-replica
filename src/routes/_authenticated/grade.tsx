import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Calculator, CheckCircle2, ChevronRight, HelpCircle, Layers, Search, Sliders } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, Tag } from "@/components/tensora/ui";
import { useTensora, rollStats } from "@/lib/tensora/store";
import {
  M_TO_YD,
  gradeFor,
  scoreFor,
  systemLabel,
  systemUnit,
  type ScoringSystem,
} from "@/lib/tensora/scoring";
import { tabSearch } from "@/lib/tensora/search";
import { useCan } from "@/lib/tensora/use-can";

export const Route = createFileRoute("/_authenticated/grade")({
  validateSearch: tabSearch,
  head: () => ({
    meta: [
      { title: "Tensora Grade — Buyer Standards · Araneid" },
      { name: "description", content: "Per-buyer scoring standards (4-point, 10-point, Graniteville 78) and automatic roll grading." },
      { property: "og:title", content: "Tensora Grade — Araneid" },
      { property: "og:description", content: "Per-buyer standards and automatic roll grading." },
    ],
  }),
  component: GradePage,
});

interface BuyerPreset {
  name: string;
  system: ScoringSystem;
  limit: number;
  description: string;
}

const BUYER_PRESETS: BuyerPreset[] = [
  { name: "H&M Standard", system: "4pt", limit: 20, description: "ASTM D5430 4-point, ≤20 pts/100 yd² threshold for circular knits" },
  { name: "Inditex / Zara", system: "4pt", limit: 18, description: "Strict 18 pt limit for premium finished jersey & rib fabrics" },
  { name: "Target / Walmart", system: "10pt", limit: 25, description: "10-Point system, max 25 points per 100 linear yards" },
  { name: "Marks & Spencer", system: "g78", limit: 15, description: "Graniteville 78 system, maximum 15% allowance of width/9" },
];

function GradePage() {
  const { tab = "results" } = Route.useSearch();
  const navigate = useNavigate({ from: "/grade" });
  const state = useTensora();
  const { buyers, rolls, updateBuyer } = state;
  const canEdit = useCan("certify");

  // Filtering in results tab
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  // Simulator State
  const [simSystem, setSimSystem] = useState<ScoringSystem>("4pt");
  const [simPoints, setSimPoints] = useState<number>(18);
  const [simLengthM, setSimLengthM] = useState<number>(120);
  const [simWidthIn, setSimWidthIn] = useState<number>(58);
  const [simLimit, setSimLimit] = useState<number>(20);

  // Compute live roll evaluations
  const evaluatedRolls = useMemo(() => {
    return rolls.map((r) => {
      const s = rollStats(state, r.id);
      const g = gradeFor(s.score, s.buyer.limit);
      return { roll: r, stats: s, grade: g };
    });
  }, [rolls, state]);

  // KPI stats
  const kpis = useMemo(() => {
    const total = evaluatedRolls.length;
    if (total === 0) return { total: 0, aCount: 0, aPct: 0, bCount: 0, bPct: 0, rCount: 0, rPct: 0, avgScore: 0 };
    const aCount = evaluatedRolls.filter((r) => r.grade === "A").length;
    const bCount = evaluatedRolls.filter((r) => r.grade === "B").length;
    const rCount = evaluatedRolls.filter((r) => r.grade === "REJECT").length;
    const avgScore = evaluatedRolls.reduce((acc, r) => acc + r.stats.score, 0) / total;
    return {
      total,
      aCount,
      aPct: Math.round((aCount / total) * 100),
      bCount,
      bPct: Math.round((bCount / total) * 100),
      rCount,
      rPct: Math.round((rCount / total) * 100),
      avgScore: avgScore.toFixed(1),
    };
  }, [evaluatedRolls]);

  // Filtered rolls
  const filteredRolls = useMemo(() => {
    return evaluatedRolls.filter((item) => {
      const matchSearch =
        search === "" ||
        item.roll.id.toLowerCase().includes(search.toLowerCase()) ||
        item.stats.buyer.name.toLowerCase().includes(search.toLowerCase());
      const matchGrade = gradeFilter === "all" || item.grade === gradeFilter;
      return matchSearch && matchGrade;
    });
  }, [evaluatedRolls, search, gradeFilter]);

  // Simulator calculated score & grade
  const simScore = scoreFor(simSystem, simPoints, simLengthM, simWidthIn);
  const simGrade = gradeFor(simScore, simLimit);
  const simYards = simLengthM * M_TO_YD;
  const simSqYards = (simYards * simWidthIn) / 36;

  const handleApplyPreset = (preset: BuyerPreset) => {
    setSimSystem(preset.system);
    setSimLimit(preset.limit);
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        module="Tensora Grade"
        title="Automatic Roll Grading & Standards"
        description="Every inspected roll is graded deterministically against buyer tolerance contracts using ASTM D5430, 10-Point, or Graniteville 78 math."
      />

      <Tabs value={tab} onValueChange={(t) => navigate({ search: { tab: t } })}>
        <TabsList className="mb-4">
          <TabsTrigger value="results">Grading Results ({evaluatedRolls.length})</TabsTrigger>
          <TabsTrigger value="standards">Buyer Standards ({buyers.length})</TabsTrigger>
          <TabsTrigger value="simulator" className="gap-1.5">
            <Calculator className="h-3.5 w-3.5 text-telemetry" />
            <span>Formula Simulator</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Grading Results */}
        <TabsContent value="results" className="space-y-4">
          {/* Production KPI Summary Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-border bg-surface-2 p-3">
              <div className="label-caps">First Quality (Grade A)</div>
              <div className="mt-1 font-mono text-2xl font-bold text-pass">{kpis.aPct}%</div>
              <div className="text-[11px] text-muted-foreground">{kpis.aCount} of {kpis.total} rolls evaluated</div>
            </div>
            <div className="rounded-md border border-border bg-surface-2 p-3">
              <div className="label-caps">Second Quality (Grade B)</div>
              <div className="mt-1 font-mono text-2xl font-bold text-minor">{kpis.bPct}%</div>
              <div className="text-[11px] text-muted-foreground">{kpis.bCount} of {kpis.total} rolls with allowance</div>
            </div>
            <div className="rounded-md border border-border bg-surface-2 p-3">
              <div className="label-caps">Rejections (Grade R)</div>
              <div className="mt-1 font-mono text-2xl font-bold text-major">{kpis.rPct}%</div>
              <div className="text-[11px] text-muted-foreground">{kpis.rCount} rolls exceeding tolerance</div>
            </div>
            <div className="rounded-md border border-border bg-surface-2 p-3">
              <div className="label-caps">Average Defect Density</div>
              <div className="mt-1 font-mono text-2xl font-bold text-primary">{kpis.avgScore}</div>
              <div className="text-[11px] text-muted-foreground">Mean points per 100 yd²</div>
            </div>
          </div>

          {/* Table Header Filter Toolbar */}
          <Panel
            title={
              <div className="flex items-center gap-2">
                <span>Evaluated Inventory</span>
                <span className="text-muted-foreground font-normal">({filteredRolls.length} shown)</span>
              </div>
            }
            action={
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter roll or buyer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 w-44 pl-8 text-xs"
                  />
                </div>
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    <SelectItem value="A">Grade A (Firsts)</SelectItem>
                    <SelectItem value="B">Grade B (Seconds)</SelectItem>
                    <SelectItem value="REJECT">Grade R (Rejects)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
            bodyClassName="p-0"
          >
            {filteredRolls.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No rolls matched the filter criteria.</div>
            ) : (
              filteredRolls.map(({ roll: r, stats: s, grade: g }) => (
                <Link
                  key={r.id}
                  to="/trace/$rollId"
                  params={{ rollId: r.id }}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-accent/30 transition-colors sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"
                >
                  <div>
                    <div className="font-mono text-sm font-semibold text-primary">{r.id}</div>
                    <div className="text-[11px] text-muted-foreground">{r.article} · {r.gsm} GSM</div>
                  </div>
                  <div className="hidden text-xs sm:block">
                    <div className="font-medium">{s.buyer.name}</div>
                    <div className="text-[10px] text-muted-foreground">{r.site}</div>
                  </div>
                  <div className="hidden text-xs text-muted-foreground sm:block">
                    <div>{systemLabel[s.buyer.system]}</div>
                    <div className="font-mono text-[10px]">{r.lengthM.toFixed(1)} m × {r.widthIn}&quot;</div>
                  </div>
                  <div className="hidden font-mono text-sm sm:block">
                    <span className="font-bold text-foreground">{s.score.toFixed(1)}</span>{" "}
                    <span className="text-[10px] text-muted-foreground">/ {s.buyer.limit} {systemUnit[s.buyer.system]}</span>
                    <div className="text-[10px] text-muted-foreground">{s.points} total pts</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag tone={g === "A" ? "pass" : g === "B" ? "minor" : "major"} className="w-20 justify-center font-bold">
                      Grade {g === "REJECT" ? "R" : g}
                    </Tag>
                    <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                  </div>
                </Link>
              ))
            )}
          </Panel>
        </TabsContent>

        {/* Tab 2: Buyer Standards */}
        <TabsContent value="standards" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {buyers.map((b) => (
              <Panel key={b.id} title={b.name} action={<span className="font-mono text-[10px] text-muted-foreground">{b.id} · {b.region}</span>}>
                <div className="space-y-3">
                  <div>
                    <div className="label-caps mb-1.5">Scoring system</div>
                    <Select disabled={!canEdit} value={b.system} onValueChange={(v) => updateBuyer(b.id, { system: v as ScoringSystem })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["4pt", "10pt", "g78"] as ScoringSystem[]).map((s) => <SelectItem key={s} value={s}>{systemLabel[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="label-caps mb-1.5">Acceptance limit ({systemUnit[b.system]})</div>
                    <Input type="number" disabled={!canEdit} value={b.limit} onChange={(e) => updateBuyer(b.id, { limit: Number(e.target.value) || 0 })} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
                    <div className="rounded border border-pass/40 bg-pass/10 p-1.5 text-pass">A ≤ {(b.limit * 0.6).toFixed(1)}</div>
                    <div className="rounded border border-minor/40 bg-minor/10 p-1.5 text-minor">B ≤ {b.limit}</div>
                    <div className="rounded border border-major/40 bg-major/10 p-1.5 text-major">R &gt; {b.limit}</div>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </TabsContent>

        {/* Tab 3: Formula Simulator & Textile Auditor */}
        <TabsContent value="simulator" className="space-y-4">
          {/* Quick Buyer Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Sliders className="h-3.5 w-3.5 text-telemetry" />
              Standard Contract Presets:
            </span>
            {BUYER_PRESETS.map((p) => (
              <Button
                key={p.name}
                size="sm"
                variant="outline"
                className="h-7 text-xs border-border hover:border-primary"
                onClick={() => handleApplyPreset(p)}
              >
                {p.name}
              </Button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            {/* Simulator Inputs */}
            <Panel title="Inspection Parameters" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <div className="label-caps mb-1.5">Scoring System</div>
                  <Select value={simSystem} onValueChange={(v) => setSimSystem(v as ScoringSystem)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4pt">ASTM D5430 4-Point System (Standard Fabric Grading)</SelectItem>
                      <SelectItem value="10pt">10-Point System (Linear Yard Penalty Normalization)</SelectItem>
                      <SelectItem value="g78">Graniteville 78 System (Loom Allowance Ratio)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="label-caps mb-1.5">Total Defect Points (pts)</div>
                    <Input
                      type="number"
                      min={0}
                      value={simPoints}
                      onChange={(e) => setSimPoints(Math.max(0, Number(e.target.value) || 0))}
                    />
                    <div className="mt-1 text-[10px] text-muted-foreground">Sum of 1, 2, 3, 4 pt flaws</div>
                  </div>
                  <div>
                    <div className="label-caps mb-1.5">Buyer Tolerance Limit</div>
                    <Input
                      type="number"
                      min={1}
                      value={simLimit}
                      onChange={(e) => setSimLimit(Math.max(1, Number(e.target.value) || 1))}
                    />
                    <div className="mt-1 text-[10px] text-muted-foreground">Max allowed: {systemUnit[simSystem]}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="label-caps mb-1.5">Roll Length (Meters)</div>
                    <Input
                      type="number"
                      min={1}
                      value={simLengthM}
                      onChange={(e) => setSimLengthM(Math.max(1, Number(e.target.value) || 1))}
                    />
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">= {simYards.toFixed(1)} linear yards</div>
                  </div>
                  <div>
                    <div className="label-caps mb-1.5">Cuttable Width (Inches)</div>
                    <Input
                      type="number"
                      min={1}
                      value={simWidthIn}
                      onChange={(e) => setSimWidthIn(Math.max(1, Number(e.target.value) || 1))}
                    />
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">= {simSqYards.toFixed(1)} sq yards</div>
                  </div>
                </div>
              </div>
            </Panel>

            {/* Calculated Result & Math Derivation */}
            <Panel title="Deterministic Mathematical Derivation">
              <div className="space-y-4">
                {/* Result Card */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 p-4">
                  <div>
                    <div className="label-caps">Calculated Roll Score</div>
                    <div className="mt-1 font-mono text-3xl font-bold text-foreground">
                      {simScore.toFixed(2)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">{systemUnit[simSystem]}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="label-caps">Automated Verdict</div>
                    <div className="mt-1">
                      <Tag tone={simGrade === "A" ? "pass" : simGrade === "B" ? "minor" : "major"} className="px-3 py-1 text-sm font-bold">
                        GRADE {simGrade}
                      </Tag>
                    </div>
                  </div>
                </div>

                {/* Step-by-Step Mathematical Proof */}
                <div className="rounded-md border border-border/80 bg-surface-2/60 p-3.5 space-y-2.5 font-mono text-xs">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Formal Mathematical Audit:
                  </div>

                  {simSystem === "4pt" && (
                    <div className="space-y-1.5 text-muted-foreground text-[11px] leading-relaxed">
                      <div>1. Metric Conversion: <span className="text-foreground">{simLengthM} m × 1.093613 = {simYards.toFixed(2)} yards</span></div>
                      <div>2. Total Surface Area: <span className="text-foreground">({simYards.toFixed(2)} yd × {simWidthIn} in) / 36 = {simSqYards.toFixed(2)} sq yd</span></div>
                      <div>
                        3. Formula: <span className="text-telemetry font-bold">(Points × 3600) / (Linear Yards × Cuttable Width)</span>
                      </div>
                      <div className="pl-2 border-l-2 border-telemetry/40">
                        = ({simPoints} × 3600) / ({simYards.toFixed(2)} × {simWidthIn})
                        <br />
                        = {(simPoints * 3600).toLocaleString()} / {(simYards * simWidthIn).toFixed(2)}
                        <br />
                        = <span className="font-bold text-foreground">{simScore.toFixed(2)} pts / 100 yd²</span>
                      </div>
                      <div>
                        4. Threshold Evaluation: {simScore.toFixed(2)} ≤ {(simLimit * 0.6).toFixed(1)} (Grade A) | ≤ {simLimit} (Grade B) | &gt; {simLimit} (Reject)
                        <br />
                        → <span className="font-bold text-foreground">Outcome: Grade {simGrade}</span>
                      </div>
                    </div>
                  )}

                  {simSystem === "10pt" && (
                    <div className="space-y-1.5 text-muted-foreground text-[11px] leading-relaxed">
                      <div>1. Linear Yards: <span className="text-foreground">{simLengthM} m × 1.093613 = {simYards.toFixed(2)} yd</span></div>
                      <div>
                        2. Formula: <span className="text-telemetry font-bold">(Points / Linear Yards) × 100</span>
                      </div>
                      <div className="pl-2 border-l-2 border-telemetry/40">
                        = ({simPoints} / {simYards.toFixed(2)}) × 100
                        <br />
                        = <span className="font-bold text-foreground">{simScore.toFixed(2)} pts / 100 yd</span>
                      </div>
                    </div>
                  )}

                  {simSystem === "g78" && (
                    <div className="space-y-1.5 text-muted-foreground text-[11px] leading-relaxed">
                      <div>1. Linear Yards: <span className="text-foreground">{simLengthM} m × 1.093613 = {simYards.toFixed(2)} yd</span></div>
                      <div>2. Allowed Points: <span className="text-foreground">({simWidthIn}&quot; / 9) × {simYards.toFixed(2)} = {(((simWidthIn / 9) * simYards)).toFixed(1)} pts</span></div>
                      <div>
                        3. Formula: <span className="text-telemetry font-bold">(Actual Points / Allowed Points) × 100%</span>
                      </div>
                      <div className="pl-2 border-l-2 border-telemetry/40">
                        = <span className="font-bold text-foreground">{simScore.toFixed(2)}% of allowance</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ASTM Reference Citation */}
                <div className="rounded border border-border/50 bg-background/50 p-2.5 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Standard Reference:</span> ASTM D5430-13 Standard Test Methods for Visually Inspecting and Grading Fabrics. Penalty points: 1 pt (≤3&quot;), 2 pt (3–6&quot;), 3 pt (6–9&quot;), 4 pt (&gt;9&quot; or holes). Maximum 4 points per linear yard.
                </div>
              </div>
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
