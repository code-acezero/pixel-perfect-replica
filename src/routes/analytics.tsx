import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Tag } from "@/components/tensora/ui";
import { useTensora, rollStats } from "@/lib/tensora/store";
import { trend30 } from "@/lib/tensora/data";
import { tabSearch } from "@/lib/tensora/search";

export const Route = createFileRoute("/analytics")({
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
  const pareto = Object.entries(state.defects.reduce<Record<string, number>>((a, d) => ((a[d.cls] = (a[d.cls] ?? 0) + d.points), a), {}))
    .map(([cls, pts]) => ({ cls, pts }))
    .sort((a, b) => b.pts - a.pts);
  const suppliers = Array.from(new Set(state.rolls.map((r) => r.supplier))).map((sup) => {
    const rs = state.rolls.filter((r) => r.supplier === sup).map((r) => rollStats(state, r.id));
    return { sup, rolls: rs.length, avg: rs.reduce((a, s) => a + s.score, 0) / rs.length, pass: rs.filter((s) => s.pass).length };
  });

  const exportCsv = () => {
    const rows = [["id", "roll", "meter", "class", "points", "confidence", "status"], ...state.defects.map((d) => [d.id, d.rollId, d.meter, d.cls, d.points, d.confidence, d.status])];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tensora-defects.csv";
    a.click();
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader module="Tensora Analytics" title="Quality Reports" actions={<Button variant="outline" className="gap-2" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>} />
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
          <Panel title="First-quality % · 30 days">
            <div className="h-72"><ResponsiveContainer><LineChart data={trend30}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} /><YAxis domain={[80, 100]} stroke="var(--muted-foreground)" fontSize={11} width={30} /><Tooltip contentStyle={tip} /><Line dataKey="firstQuality" stroke="var(--chart-2)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
          </Panel>
        </TabsContent>
        <TabsContent value="pareto">
          <Panel title="Penalty points by defect class">
            <div className="h-72"><ResponsiveContainer><BarChart data={pareto}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="cls" stroke="var(--muted-foreground)" fontSize={11} /><YAxis stroke="var(--muted-foreground)" fontSize={11} width={30} /><Tooltip contentStyle={tip} /><Bar dataKey="pts" fill="var(--chart-3)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
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
        <TabsContent value="copq">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[["Rejected fabric", "$4,820"], ["Buyer claims avoided", "$12,300"], ["Re-inspection hours saved", "186 h"], ["Scrap avoided (alerts)", "$1,620"]].map(([k, v]) => (
              <Panel key={k} title={k}><div className="font-mono text-3xl font-bold">{v}</div><div className="label-caps mt-1">last 30 days</div></Panel>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
