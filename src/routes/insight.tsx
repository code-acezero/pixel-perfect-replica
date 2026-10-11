import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Info, Lightbulb, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Tag, fmtDateTime } from "@/components/tensora/ui";
import { useTensora } from "@/lib/tensora/store";
import { tabSearch } from "@/lib/tensora/search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/insight")({
  validateSearch: tabSearch,
  head: () => ({
    meta: [
      { title: "Tensora Insight — Factory Intelligence · Araneid" },
      { name: "description", content: "Cluster alerts, root-cause patterns and recommendations from every inspection." },
      { property: "og:title", content: "Tensora Insight — Araneid" },
      { property: "og:description", content: "Factory intelligence and root-cause analysis." },
    ],
  }),
  component: InsightPage,
});

const PATTERNS = [
  { dim: "Line ASH-U03-L04", issue: "Needle Line", n: 3, span: "15 m", cause: "Damaged latch needle — Cylinder Head 2, Needle #142" },
  { dim: "Line GZP-U01-L07", issue: "Lycra Out", n: 5, span: "2 rolls", cause: "Elastane feeder tension drift on feeder 14" },
  { dim: "Yarn lot YL-OC-0551", issue: "Slub", n: 11, span: "3 rolls", cause: "Spinning irregularity at supplier (CV% high)" },
  { dim: "Shift C (night)", issue: "Oil Stain", n: 7, span: "48 h", cause: "Over-lubrication after scheduled maintenance" },
];

function InsightPage() {
  const { tab = "alerts" } = Route.useSearch();
  const navigate = useNavigate({ from: "/insight" });
  const { alerts, dismissAlert, defects } = useTensora();
  const byClass = Object.entries(
    defects.reduce<Record<string, number>>((a, d) => ((a[d.cls] = (a[d.cls] ?? 0) + 1), a), {}),
  ).map(([cls, n]) => ({ cls, n }));

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader module="Tensora Insight" title="Araneid Factory Intelligence" description="Patterns across cameras, rolls, lines and suppliers — turned into actions." />
      <Tabs value={tab} onValueChange={(t) => navigate({ search: { tab: t } })}>
        <TabsList className="mb-4">
          <TabsTrigger value="alerts">Active Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="patterns">Root-Cause Patterns</TabsTrigger>
          <TabsTrigger value="recs">Recommendations</TabsTrigger>
        </TabsList>
        <TabsContent value="alerts" className="space-y-3">
          {alerts.length === 0 && <Panel><p className="text-sm text-muted-foreground">No active alerts.</p></Panel>}
          {alerts.map((a) => (
            <div key={a.id} className={cn("panel flex gap-3 p-4", a.level === "major" && "border-major/40 bg-major/5", a.level === "minor" && "border-minor/40")}>
              {a.level === "info" ? <Info className="h-5 w-5 shrink-0 text-telemetry" /> : <AlertTriangle className={cn("h-5 w-5 shrink-0", a.level === "major" ? "text-major" : "text-minor")} />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{a.title}</span>
                  <Tag tone={a.level === "major" ? "major" : a.level === "minor" ? "minor" : "telemetry"}>{a.level}</Tag>
                  <span className="font-mono text-[10px] text-muted-foreground">{a.id} · {fmtDateTime(a.ts)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-muted-foreground">{a.location}</span>
                  {a.savings && <span className="font-mono text-pass">Estimated scrap saved: ${a.savings}</span>}
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => dismissAlert(a.id)} aria-label="Acknowledge"><X className="h-4 w-4" /></Button>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="patterns">
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Detected clusters" bodyClassName="p-0">
              {PATTERNS.map((p) => (
                <div key={p.dim} className="border-b border-border px-4 py-3 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-primary">{p.dim}</span>
                    <Tag tone="minor">{p.n}× {p.issue}</Tag>
                    <span className="text-xs text-muted-foreground">within {p.span}</span>
                  </div>
                  <p className="mt-1 text-sm">Probable cause: {p.cause}</p>
                </div>
              ))}
            </Panel>
            <Panel title="Defects by class">
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={byClass} layout="vertical">
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis type="category" dataKey="cls" stroke="var(--muted-foreground)" fontSize={11} width={90} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} />
                    <Bar dataKey="n" fill="var(--chart-1)" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </TabsContent>
        <TabsContent value="recs" className="grid gap-3 md:grid-cols-2">
          {[
            ["Inspect Needle #142 on Cylinder Head 2 (Line #04)", "Prevents an estimated 40 m of needle-line fabric per shift.", "$380 / shift"],
            ["Recalibrate elastane feeder 14 (GZP Line #07)", "Lycra Out defects concentrated on one feeder position.", "$1,240 / week"],
            ["Raise incoming yarn check for YL-OC-0551", "Slub rate 2.4× baseline. Request CV% report from supplier.", "Claim avoidance"],
            ["Re-train night shift on post-maintenance wipe-down", "Oil stains spike within 4 h of lubrication.", "$610 / week"],
          ].map(([t, b, v]) => (
            <Panel key={t}>
              <div className="flex gap-3">
                <Lightbulb className="h-5 w-5 shrink-0 text-minor" />
                <div>
                  <div className="font-medium">{t}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{b}</p>
                  <div className="mt-2 font-mono text-xs text-pass">Impact: {v}</div>
                </div>
              </div>
            </Panel>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
