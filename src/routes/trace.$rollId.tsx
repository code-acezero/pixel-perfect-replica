import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, FileBadge } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Tag, VerdictBadge, fmtDateTime } from "@/components/tensora/ui";
import { RollMap } from "@/components/tensora/roll-map";
import { DefectLedger } from "@/components/tensora/defect-ledger";
import { useTensora, rollStats } from "@/lib/tensora/store";
import { rollsSeed } from "@/lib/tensora/data";
import { systemUnit, gradeFor } from "@/lib/tensora/scoring";
import { tabSearch } from "@/lib/tensora/search";

export const Route = createFileRoute("/trace/$rollId")({
  validateSearch: tabSearch,
  loader: ({ params }) => {
    if (!rollsSeed.some((r) => r.id === params.rollId)) throw notFound();
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
  errorComponent: ({ error }) => <div className="p-10 text-center text-major">{error.message}</div>,
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

  return (
    <div className="mx-auto max-w-[1600px]">
      <Link to="/trace" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ChevronLeft className="h-3.5 w-3.5" /> Roll register</Link>
      <PageHeader
        module="Tensora Trace"
        title={`Roll #${roll.id}`}
        description={`${roll.article} · ${roll.gsm} GSM · ${buyer.name}`}
        actions={<Button asChild className="gap-2"><Link to="/certify" search={{ roll: roll.id }}><FileBadge className="h-4 w-4" /> Certify roll</Link></Button>}
      />
      <Tabs value={tab} onValueChange={(t) => navigate({ search: { tab: t } })}>
        <div className="mb-4 overflow-x-auto">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="map">Roll Map & Cut Plan</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="tests">Secondary Tests</TabsTrigger>
            <TabsTrigger value="genealogy">Genealogy</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="summary" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Verdict">
              <div className="font-mono text-4xl font-bold">{s.score.toFixed(1)}</div>
              <div className="label-caps">{systemUnit[buyer.system]} · limit {buyer.limit}</div>
              <div className="mt-3"><VerdictBadge pass={s.pass} /></div>
              <div className="mt-3 text-sm">Grade <span className="font-mono font-bold">{grade}</span></div>
            </Panel>
            <Panel title="Roll data" className="lg:col-span-2">
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {[
                  ["Length", `${roll.lengthM.toFixed(1)} m`], ["Width", `${roll.widthIn} in`], ["Penalty", `${s.points} pts`], ["Defects", s.list.length],
                  ["Lot", roll.lot], ["Yarn lot", roll.yarnLot], ["Site", roll.site], ["Line", roll.line],
                ].map(([k, v]) => (
                  <div key={String(k)}><dt className="label-caps">{k}</dt><dd className="mt-0.5 font-mono text-xs">{v}</dd></div>
                ))}
              </dl>
            </Panel>
          </div>
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
        <TabsContent value="tests">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["GSM", `${roll.gsmMeasured}`, `spec ${roll.gsm} ±5%`, Math.abs(roll.gsmMeasured - roll.gsm) / roll.gsm <= 0.05],
              ["Width", `${roll.widthMeasured} in`, `spec ${roll.widthIn} in ±1`, Math.abs(roll.widthMeasured - roll.widthIn) <= 1],
              ["Bow / skew", `${roll.bowPct}%`, "max 2.5%", roll.bowPct <= 2.5],
              ["Shade ΔE", `${roll.shadeDE}`, "max 0.8", roll.shadeDE <= 0.8],
              ["Shrinkage", `${roll.shrinkPct}%`, "max 5%", roll.shrinkPct <= 5],
            ].map(([k, v, spec, ok]) => (
              <Panel key={String(k)} title={String(k)}>
                <div className={`font-mono text-2xl font-bold ${ok ? "text-pass" : "text-major"}`}>{v}</div>
                <div className="mt-1 text-xs text-muted-foreground">{spec}</div>
              </Panel>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="genealogy">
          <Panel title="Material genealogy">
            <ol className="flex flex-col gap-2 md:flex-row md:items-stretch">
              {[
                ["Yarn lot", roll.yarnLot, roll.supplier],
                ["Knitting", roll.line, "Circular knit"],
                ["Greige roll", `${roll.id}-G`, roll.site],
                ["Inspection", sessions[0]?.id ?? "—", sessions[0]?.location ?? ""],
                ["Finished roll", roll.id, roll.lot],
                ["Buyer", buyer.id, buyer.name],
              ].map(([k, v, sub], i) => (
                <li key={k} className="flex-1 rounded-md border border-border bg-surface-2 p-3">
                  <div className="label-caps">{i + 1} · {k}</div>
                  <div className="mt-1 font-mono text-sm text-primary">{v}</div>
                  <div className="text-xs text-muted-foreground">{sub}</div>
                </li>
              ))}
            </ol>
          </Panel>
        </TabsContent>
        <TabsContent value="audit">
          <Panel title="Audit trail" bodyClassName="p-0">
            {all.filter((d) => d.status !== "pending").map((d) => (
              <div key={d.id} className="flex flex-wrap gap-x-3 border-b border-border px-4 py-2 font-mono text-xs last:border-0">
                <span className="text-muted-foreground">{fmtDateTime(d.ts)}</span>
                <span>{d.id}</span>
                <span className="text-primary">{d.status.toUpperCase()}</span>
                <span>{d.cls}{d.originalCls ? ` (was ${d.originalCls})` : ""}</span>
                <span className="text-muted-foreground">by {d.reviewer ?? "QC Lead"}</span>
              </div>
            ))}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
