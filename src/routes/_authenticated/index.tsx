import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Activity, Award, Camera, DollarSign, Layers, ShieldCheck } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Stat, Tag, fmtTime } from "@/components/tensora/ui";
import { useTensora, rollStats } from "@/lib/tensora/store";
import { trend30 } from "@/lib/tensora/data";
import { tabSearch } from "@/lib/tensora/search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  validateSearch: tabSearch,
  head: () => ({
    meta: [
      { title: "Tensora Command — Araneid" },
      { name: "description", content: "Live plant quality overview: inspection sessions, first-quality rate, ASTM scores and alerts across every camera." },
      { property: "og:title", content: "Tensora Command — Araneid" },
      { property: "og:description", content: "Live plant quality overview across every Tensora camera." },
    ],
  }),
  component: CommandPage,
});

const RANGE: Record<string, number> = { live: 7, today: 10, "7d": 7, "30d": 30 };

function CommandPage() {
  const { tab = "live" } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const state = useTensora();
  const { sessions, alerts, devices, rolls, defects } = state;
  const data = trend30.slice(-(RANGE[tab] ?? 7));
  const scores = rolls.map((r) => rollStats(state, r.id));
  const passRate = (scores.filter((s) => s.pass).length / scores.length) * 100;
  const avg = scores.reduce((a, s) => a + s.score, 0) / scores.length;
  const online = devices.filter((d) => d.status === "online").length;

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        module="Tensora Command"
        title="Plant Quality Overview"
        description="Every camera, every session, every roll — in one view."
        actions={
          <Button asChild className="gap-2">
            <Link to="/capture"><Camera className="h-4 w-4" /> Start inspection</Link>
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(t) => navigate({ search: { tab: t } })} className="mb-4">
        <TabsList>
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="7d">7 Days</TabsTrigger>
          <TabsTrigger value="30d">30 Days</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Sessions" value={sessions.length + (tab === "30d" ? 412 : tab === "7d" ? 96 : 0)} icon={Activity} tone="telemetry" delta={`${sessions.filter((s) => s.status === "live").length} live now`} />
        <Stat label="First quality" value={passRate.toFixed(1)} unit="%" icon={ShieldCheck} tone="pass" delta="+1.8% vs prior" />
        <Stat label="Avg score" value={avg.toFixed(1)} unit="pts/100yd²" icon={Award} delta="Across graded rolls" />
        <Stat label="Rolls graded" value={rolls.length + (tab === "30d" ? 1180 : tab === "7d" ? 274 : 0)} icon={Layers} />
        <Stat label="Defects flagged" value={defects.length} tone="minor" delta={`${defects.filter((d) => d.status === "pending").length} pending review`} />
        <Stat label="Scrap avoided" value={`$${(alerts.reduce((a, x) => a + (x.savings ?? 0), 0) + (tab === "30d" ? 18400 : 0)).toLocaleString()}`} icon={DollarSign} tone="pass" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Quality trend · pts / 100 yd²" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} width={30} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} />
                <ReferenceLine y={24} stroke="var(--major)" strokeDasharray="4 4" label={{ value: "Limit 24", fill: "var(--major)", fontSize: 10 }} />
                <Area type="monotone" dataKey="score" stroke="var(--chart-1)" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Alert feed" action={<Link to="/insight" className="text-xs text-primary">View all</Link>} bodyClassName="p-0">
          {alerts.map((a) => (
            <div key={a.id} className="border-b border-border px-4 py-3 last:border-0">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", a.level === "major" ? "bg-major" : a.level === "minor" ? "bg-minor" : "bg-telemetry")} />
                <span className="truncate text-sm font-medium">{a.title}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{fmtTime(a.ts)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
            </div>
          ))}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Inspection sessions" className="xl:col-span-2" bodyClassName="p-0">
          <div className="divide-y divide-border">
            {sessions.map((s) => {
              const st = rollStats(state, s.rollId);
              const dev = devices.find((d) => d.id === s.deviceId);
              return (
                <Link key={s.id} to="/trace/$rollId" params={{ rollId: s.rollId }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-accent/30 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      {s.status === "live" && <span className="h-2 w-2 animate-pulse rounded-full bg-major" />}
                      <span className="text-primary">{s.id}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{s.inspector} · {s.location}</div>
                  </div>
                  <div className="hidden min-w-0 text-xs sm:block">
                    <div className="font-mono">Roll {s.rollId}</div>
                    <div className="truncate text-muted-foreground">{dev?.kind} · {s.metersInspected.toFixed(1)} m</div>
                  </div>
                  <div className="hidden font-mono text-sm sm:block">{st.score.toFixed(1)} <span className="text-[10px] text-muted-foreground">/ {st.buyer.limit}</span></div>
                  <Tag tone={st.pass ? "pass" : "major"}>{st.pass ? "Pass" : "Reject"}</Tag>
                </Link>
              );
            })}
          </div>
        </Panel>
        <Panel title={`Camera fleet · ${online}/${devices.length} online`} action={<Link to="/devices" className="text-xs text-primary">Manage</Link>} bodyClassName="p-0">
          {devices.map((d) => (
            <div key={d.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", d.status === "online" ? "bg-pass" : d.status === "idle" ? "bg-minor" : "bg-muted-foreground")} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{d.location}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{d.id} · {d.kind}</div>
              </div>
              <span className="font-mono text-xs text-telemetry">{d.quality}%</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
