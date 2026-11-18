import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle, Info, Lightbulb, Wrench, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Tag, fmtDateTime } from "@/components/tensora/ui";
import { useTensora } from "@/lib/tensora/store";
import { tabSearch } from "@/lib/tensora/search";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/tensora/use-can";
import type { DefectClass } from "@/lib/tensora/data";

export const Route = createFileRoute("/_authenticated/insight")({
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

interface ClusterPattern {
  id: string;
  dim: string;
  issue: DefectClass;
  n: number;
  span: string;
  cause: string;
  recTitle: string;
  recBody: string;
  impact: string;
  severity: "major" | "minor";
}

function InsightPage() {
  const { tab = "alerts" } = Route.useSearch();
  const navigate = useNavigate({ from: "/insight" });
  const { alerts, dismissAlert, defects, rolls, addAuditEntry } = useTensora();
  const canReview = useCan("review");
  const [workOrdersCreated, setWorkOrdersCreated] = useState<Record<string, boolean>>({});

  // Dynamic spatial and class defect clustering from live store data
  const { patterns, recommendations } = useMemo(() => {
    // Group active defects (non-dismissed) by defect class and rollId
    const groups: Record<string, typeof defects> = {};
    for (const d of defects) {
      if (d.status === "dismissed") continue;
      const key = `${d.rollId}::${d.cls}`;
      groups[key] = groups[key] || [];
      groups[key].push(d);
    }

    const clusters: ClusterPattern[] = [];

    // Analyze each group to identify clusters
    for (const [key, group] of Object.entries(groups)) {
      const [rollId, clsStr] = key.split("::");
      const cls = clsStr as DefectClass;
      const roll = rolls.find((r) => r.id === rollId);
      const line = roll?.line || "Line #04 (Circular Knit)";
      const site = roll?.site || "ASH-U03";
      const supplier = roll?.supplier || "Square Yarns Ltd";
      const yarnLot = roll?.yarnLot || "YL-30S-7781";

      const meters = group.map((d) => d.meter).sort((a, b) => a - b);
      const minM = meters[0] ?? 0;
      const maxM = meters[meters.length - 1] ?? 0;
      const spanDiff = +(maxM - minM).toFixed(1);
      const spanStr = spanDiff > 0 ? `${spanDiff} m on Roll ${rollId}` : `${group.length} occurrences`;

      // Determine severity & domain root-cause logic based on textile mechanics
      let cause = "";
      let recTitle = "";
      let recBody = "";
      let impact = "";
      let severity: "major" | "minor" = "minor";

      switch (cls) {
        case "Needle Line":
          severity = "major";
          cause = `Damaged latch needle on Cylinder Head 2 (affects ${line})`;
          recTitle = `Inspect Cylinder Head & Replace Needle on ${line}`;
          recBody = `${group.length} needle line defects clustered within ${spanDiff || 15} m. Replace needle #142 to avoid downgrading remaining ${roll?.lengthM.toFixed(0) ?? 140} m roll.`;
          impact = `$${group.length * 130 + 250} / shift`;
          break;
        case "Lycra Out":
          severity = "major";
          cause = `Elastane feeder tension drift on positive feeder 14 (${line})`;
          recTitle = `Recalibrate elastane feeder tension on ${line}`;
          recBody = `${group.length} Lycra Out defects recorded. Feeder tension drifted outside the 2.5 cN specification.`;
          impact = `$${group.length * 240 + 520} / week`;
          break;
        case "Oil Stain":
          severity = "minor";
          cause = `Needle cylinder over-lubrication or dirty take-down rollers at ${site}`;
          recTitle = `Wipe down needle cylinder and adjust oiler drip rate (${site})`;
          recBody = `${group.length} oil stains flagged within ${spanStr}. Throttle micro-mist lubricator by 15%.`;
          impact = `$${group.length * 90 + 340} / week`;
          break;
        case "Slub":
          severity = "minor";
          cause = `Spinning mass irregularity (CV% > 14.8%) on Yarn Lot ${yarnLot} from ${supplier}`;
          recTitle = `Issue supplier quality claim for Yarn Lot ${yarnLot}`;
          recBody = `Slub count (${group.length}x) is 2.3x plant baseline. Request supplier testing certificate from ${supplier}.`;
          impact = `Claim Avoidance ($${group.length * 110 + 200})`;
          break;
        case "Hole":
        case "Drop Stitch":
          severity = "major";
          cause = `Excessive take-down tension or grooved ceramic yarn eyelet on ${line}`;
          recTitle = `Inspect ceramic yarn guides and reduce take-down tension on ${line}`;
          recBody = `${group.length} structural knit holes detected. Inspect yarn path for abrasive burrs.`;
          impact = `$${group.length * 190 + 310} / roll`;
          break;
        default:
          cause = `Feed tension variance or yarn count variation on ${line}`;
          recTitle = `Balance yarn tensions on ${line}`;
          recBody = `${group.length} defects identified across ${spanStr}. Re-verify positive feed belts.`;
          impact = `$${group.length * 80 + 150} / shift`;
      }

      clusters.push({
        id: `CLU-${rollId}-${cls.replace(/\s+/g, "")}`,
        dim: line,
        issue: cls,
        n: group.length,
        span: spanStr,
        cause,
        recTitle,
        recBody,
        impact,
        severity,
      });
    }

    // Sort by defect count and severity
    clusters.sort((a, b) => b.n - a.n);

    // If clusters are empty (no defects yet), provide baseline factory patterns
    if (clusters.length === 0) {
      clusters.push({
        id: "CLU-NOMINAL",
        dim: "All Lines (Plant Nominal)",
        issue: "Slub",
        n: 0,
        span: "Plant-wide",
        cause: "Zero anomalous defect clusters detected in current inspection window.",
        recTitle: "Maintain continuous optical calibration (D65 standard)",
        recBody: "Camera telemetry indicates nominal illumination and edge focus. Continue standard ASTM inspection protocol.",
        impact: "$0 / nominal",
        severity: "minor",
      });
    }

    const recs = clusters.map((c) => ({
      id: c.id,
      title: c.recTitle,
      body: c.recBody,
      impact: c.impact,
      severity: c.severity,
    }));

    return { patterns: clusters, recommendations: recs };
  }, [defects, rolls]);

  const byClass = Object.entries(
    defects.reduce<Record<string, number>>((a, d) => ((a[d.cls] = (a[d.cls] ?? 0) + 1), a), {}),
  ).map(([cls, n]) => ({ cls, n }));

  const handleCreateWorkOrder = (rec: { id: string; title: string }) => {
    setWorkOrdersCreated((prev) => ({ ...prev, [rec.id]: true }));
    addAuditEntry(`Maintenance Work Order created for: ${rec.title}`);
    toast.success(`Work Order logged: ${rec.title}`);
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        module="Tensora Insight"
        title="Araneid Factory Intelligence"
        description="Live spatial clustering across cameras, rolls, lines and suppliers — turned into root-cause actions."
      />
      <Tabs value={tab} onValueChange={(t) => navigate({ search: { tab: t } })}>
        <TabsList className="mb-4">
          <TabsTrigger value="alerts">Active Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="patterns">Root-Cause Patterns ({patterns.length})</TabsTrigger>
          <TabsTrigger value="recs">Recommendations ({recommendations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-3">
          {alerts.length === 0 && <Panel><p className="text-sm text-muted-foreground">No active alerts.</p></Panel>}
          {alerts.map((a) => (
            <div
              key={a.id}
              className={cn(
                "panel flex gap-3 p-4",
                a.level === "major" && "border-major/40 bg-major/5",
                a.level === "minor" && "border-minor/40",
              )}
            >
              {a.level === "info" ? (
                <Info className="h-5 w-5 shrink-0 text-telemetry" />
              ) : (
                <AlertTriangle
                  className={cn("h-5 w-5 shrink-0", a.level === "major" ? "text-major" : "text-minor")}
                />
              )}
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
              <Button
                size="icon"
                variant="ghost"
                disabled={!canReview}
                onClick={() => dismissAlert(a.id)}
                aria-label="Acknowledge"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="patterns">
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title={`Live detected clusters (${patterns.length})`} bodyClassName="p-0">
              {patterns.map((p) => (
                <div key={p.id} className="border-b border-border px-4 py-3 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-primary">{p.dim}</span>
                    <Tag tone={p.severity === "major" ? "major" : "minor"}>
                      {p.n}× {p.issue}
                    </Tag>
                    <span className="text-xs text-muted-foreground">within {p.span}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium">Probable cause: <span className="text-muted-foreground font-normal">{p.cause}</span></p>
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
          {recommendations.map((r) => {
            const isCreated = workOrdersCreated[r.id];
            return (
              <Panel key={r.id}>
                <div className="flex gap-3">
                  <Lightbulb className="h-5 w-5 shrink-0 text-minor mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm sm:text-base">{r.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs text-pass font-semibold">Impact: {r.impact}</span>
                      <Button
                        size="sm"
                        variant={isCreated ? "outline" : "secondary"}
                        className="h-8 gap-1.5 text-xs"
                        disabled={isCreated}
                        onClick={() => handleCreateWorkOrder(r)}
                      >
                        {isCreated ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5 text-pass" /> Logged
                          </>
                        ) : (
                          <>
                            <Wrench className="h-3.5 w-3.5" /> Action / Work Order
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
