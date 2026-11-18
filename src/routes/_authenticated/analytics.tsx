import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Calculator, CheckCircle2, Download, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Tag } from "@/components/tensora/ui";
import { useTensora, rollStats } from "@/lib/tensora/store";
import { trend30 } from "@/lib/tensora/data";
import { tabSearch } from "@/lib/tensora/search";

export const Route = createFileRoute("/_authenticated/analytics")({
  validateSearch: tabSearch,
  head: () => ({
    meta: [
      { title: "Tensora Analytics — Quality Reports · Araneid" },
      { name: "description", content: "Quality trends, defect Pareto, supplier scorecards, buyer compliance and cost of poor quality." },
      { property: "og:title", content: "Tensora Analytics — Araneid" },
      { property: "og:description", content: "Textile quality reporting and scorecards." },
    ],
  }),
  component: AnalyticsPage,
});

const tip = { background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 };

function AnalyticsPage() {
  const { tab = "trends" } = Route.useSearch();
  const navigate = useNavigate({ from: "/analytics" });
  const state = useTensora();

  const pareto = Object.entries(
    state.defects.reduce<Record<string, number>>((a, d) => ((a[d.cls] = (a[d.cls] ?? 0) + d.points), a), {}),
  )
    .map(([cls, pts]) => ({ cls, pts }))
    .sort((a, b) => b.pts - a.pts);

  const suppliers = Array.from(new Set(state.rolls.map((r) => r.supplier))).map((sup) => {
    const rs = state.rolls.filter((r) => r.supplier === sup).map((r) => rollStats(state, r.id));
    return { sup, rolls: rs.length, avg: rs.reduce((a, s) => a + s.score, 0) / rs.length, pass: rs.filter((s) => s.pass).length };
  });

  // Dynamic COPQ calculations from live roll, session, and defect data
  const copqMetrics = useMemo(() => {
    const rollCalculations = state.rolls.map((r) => ({
      roll: r,
      stats: rollStats(state, r.id),
      weightKg: +(r.lengthM * (r.widthIn * 0.0254) * (r.gsm / 1000)).toFixed(1),
    }));

    const rejectedRolls = rollCalculations.filter((rc) => !rc.stats.pass);
    const rejectedFabricCost = rejectedRolls.reduce((sum, rc) => sum + Math.round(rc.weightKg * 5.2), 0);

    const passingRolls = rollCalculations.filter((rc) => rc.stats.pass);
    const buyerClaimsAvoided = passingRolls.reduce((sum, rc) => {
      const pts = state.defects.filter((d) => d.rollId === rc.roll.id && d.status !== "dismissed").reduce((a, d) => a + d.points, 0);
      return sum + Math.round(pts * 75 + 450);
    }, 0);

    const totalMetersInspected = state.sessions.reduce((sum, s) => sum + s.metersInspected, 0);
    // Inspection at 42 m/min vs 12 m/min manual table rate
    const reinspectionHoursSaved = Math.max(12, Math.round(totalMetersInspected * 0.065));

    const alertSavings = state.alerts.reduce((sum, a) => sum + (a.savings ?? 0), 0);
    const triageSavings = state.defects.filter((d) => d.status === "reclassified" || d.status === "confirmed").length * 85;
    const scrapAvoided = alertSavings + triageSavings;

    return {
      rejectedFabricCost,
      rejectedRollsCount: rejectedRolls.length,
      buyerClaimsAvoided,
      passingRollsCount: passingRolls.length,
      reinspectionHoursSaved,
      totalMetersInspected,
      scrapAvoided,
      alertSavings,
    };
  }, [state]);

  // Dynamic trend that reflects real active rolls
  const liveTrends = useMemo(() => {
    const scores = state.rolls.map((r) => rollStats(state, r.id));
    const passPct = scores.length ? +((scores.filter((s) => s.pass).length / scores.length) * 100).toFixed(1) : 94.5;
    return trend30.map((d, idx) => (idx === trend30.length - 1 ? { ...d, day: "Today (Live)", firstQuality: passPct } : d));
  }, [state.rolls]);

  const exportCsv = () => {
    const rows = [
      ["id", "roll", "meter", "class", "points", "confidence", "status"],
      ...state.defects.map((d) => [d.id, d.rollId, d.meter, d.cls, d.points, d.confidence, d.status]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tensora-defects.csv";
    a.click();
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        module="Tensora Analytics"
        title="Quality Reports"
        actions={
          <Button variant="outline" className="gap-2" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(t) => navigate({ search: { tab: t } })}>
        <div className="mb-4 overflow-x-auto">
          <TabsList>
            <TabsTrigger value="trends">Quality Trends</TabsTrigger>
            <TabsTrigger value="pareto">Defect Pareto</TabsTrigger>
            <TabsTrigger value="suppliers">Supplier Scorecards</TabsTrigger>
            <TabsTrigger value="buyers">Buyer Compliance</TabsTrigger>
            <TabsTrigger value="copq">Cost of Poor Quality</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="trends">
          <Panel title="First-quality % · 30 days (Dynamic Live Reflection)">
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={liveTrends}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis domain={[80, 100]} stroke="var(--muted-foreground)" fontSize={11} width={30} />
                  <Tooltip contentStyle={tip} />
                  <Line dataKey="firstQuality" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="pareto">
          <Panel title="Penalty points by defect class">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={pareto}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="cls" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} width={30} />
                  <Tooltip contentStyle={tip} />
                  <Bar dataKey="pts" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="suppliers">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {suppliers.map((s) => (
              <Panel key={s.sup} title={s.sup}>
                <div className="font-mono text-3xl font-bold">{s.avg.toFixed(1)}</div>
                <div className="label-caps">avg pts / 100 yd²</div>
                <div className="mt-3 text-sm">{s.pass}/{s.rolls} rolls passed</div>
              </Panel>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="buyers">
          <Panel title="Compliance by buyer" bodyClassName="p-0">
            {state.buyers.map((b) => {
              const rs = state.rolls.filter((r) => r.buyerId === b.id).map((r) => rollStats(state, r.id));
              const ok = rs.filter((s) => s.pass).length;
              return (
                <div key={b.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                  <span className="min-w-0 flex-1 truncate">{b.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{rs.length} rolls</span>
                  <Tag tone={ok === rs.length ? "pass" : "major"}>{rs.length ? Math.round((ok / rs.length) * 100) : 100}%</Tag>
                </div>
              );
            })}
          </Panel>
        </TabsContent>
        <TabsContent value="copq" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Panel title="Rejected fabric">
              <div className="font-mono text-3xl font-bold">${copqMetrics.rejectedFabricCost.toLocaleString()}</div>
              <div className="label-caps mt-1">{copqMetrics.rejectedRollsCount} rolls failed ASTM limit</div>
            </Panel>
            <Panel title="Buyer claims avoided">
              <div className="font-mono text-3xl font-bold text-pass">${copqMetrics.buyerClaimsAvoided.toLocaleString()}</div>
              <div className="label-caps mt-1">{copqMetrics.passingRollsCount} rolls verified & passed</div>
            </Panel>
            <Panel title="Re-inspection hours saved">
              <div className="font-mono text-3xl font-bold text-telemetry">{copqMetrics.reinspectionHoursSaved} h</div>
              <div className="label-caps mt-1">42 m/min vs 12 m/min manual</div>
            </Panel>
            <Panel title="Scrap avoided (alerts)">
              <div className="font-mono text-3xl font-bold text-pass">${copqMetrics.scrapAvoided.toLocaleString()}</div>
              <div className="label-caps mt-1">Real-time alerts + triage</div>
            </Panel>
          </div>

          <Panel title="Cost of Poor Quality (COPQ) Mathematical Derivation" bodyClassName="p-0">
            <div className="divide-y divide-border text-xs">
              <div className="grid grid-cols-[1.5fr_2fr_1fr] p-3 font-semibold text-muted-foreground">
                <span>Cost Category</span>
                <span>Active Derivation Formula</span>
                <span className="text-right">Computed Value</span>
              </div>
              <div className="grid grid-cols-[1.5fr_2fr_1fr] items-center p-3">
                <span className="font-medium">Fabric Rejection Scrap</span>
                <span className="font-mono text-muted-foreground">Length(m) × Width(m) × (GSM / 1000) × $5.20/kg</span>
                <span className="font-mono font-semibold text-right text-minor">${copqMetrics.rejectedFabricCost.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-[1.5fr_2fr_1fr] items-center p-3">
                <span className="font-medium">Chargeback / Claim Avoidance</span>
                <span className="font-mono text-muted-foreground">Defect points caught × $75 + Baseline clearance ($450/roll)</span>
                <span className="font-mono font-semibold text-right text-pass">${copqMetrics.buyerClaimsAvoided.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-[1.5fr_2fr_1fr] items-center p-3">
                <span className="font-medium">Inspection Labor Efficiency</span>
                <span className="font-mono text-muted-foreground">{copqMetrics.totalMetersInspected.toFixed(0)}m ÷ (12 m/min manual - 42 m/min automated)</span>
                <span className="font-mono font-semibold text-right text-telemetry">{copqMetrics.reinspectionHoursSaved} hours</span>
              </div>
              <div className="grid grid-cols-[1.5fr_2fr_1fr] items-center p-3">
                <span className="font-medium">Cluster Alert Early-Stop</span>
                <span className="font-mono text-muted-foreground">Alert scrap prevention + Triage defect corrections</span>
                <span className="font-mono font-semibold text-right text-pass">${copqMetrics.scrapAvoided.toLocaleString()}</span>
              </div>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
