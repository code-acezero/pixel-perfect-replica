import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, Tag } from "@/components/tensora/ui";
import { useTensora, rollStats } from "@/lib/tensora/store";
import { gradeFor, systemLabel, systemUnit, type ScoringSystem } from "@/lib/tensora/scoring";
import { tabSearch } from "@/lib/tensora/search";

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

function GradePage() {
  const { tab = "results" } = Route.useSearch();
  const navigate = useNavigate({ from: "/grade" });
  const state = useTensora();
  const { buyers, rolls, updateBuyer } = state;
  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader module="Tensora Grade" title="Automatic Roll Grading" description="Each buyer's standard is applied automatically the moment a roll is inspected." />
      <Tabs value={tab} onValueChange={(t) => navigate({ search: { tab: t } })}>
        <TabsList className="mb-4">
          <TabsTrigger value="results">Grading Results</TabsTrigger>
          <TabsTrigger value="standards">Buyer Standards</TabsTrigger>
        </TabsList>
        <TabsContent value="results">
          <Panel title="Rolls" bodyClassName="p-0">
            {rolls.map((r) => {
              const s = rollStats(state, r.id);
              const g = gradeFor(s.score, s.buyer.limit);
              return (
                <Link key={r.id} to="/trace/$rollId" params={{ rollId: r.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-accent/30 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                  <div className="font-mono text-sm text-primary">{r.id}</div>
                  <div className="hidden text-xs sm:block">{s.buyer.name}</div>
                  <div className="hidden text-xs text-muted-foreground sm:block">{systemLabel[s.buyer.system]}</div>
                  <div className="hidden font-mono text-sm sm:block">{s.score.toFixed(1)} <span className="text-[10px] text-muted-foreground">/ {s.buyer.limit}</span></div>
                  <Tag tone={g === "A" ? "pass" : g === "B" ? "minor" : "major"} className="w-16 justify-center">Grade {g === "REJECT" ? "R" : g}</Tag>
                </Link>
              );
            })}
          </Panel>
        </TabsContent>
        <TabsContent value="standards">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {buyers.map((b) => (
              <Panel key={b.id} title={b.name} action={<span className="font-mono text-[10px] text-muted-foreground">{b.id} · {b.region}</span>}>
                <div className="space-y-3">
                  <div>
                    <div className="label-caps mb-1.5">Scoring system</div>
                    <Select value={b.system} onValueChange={(v) => updateBuyer(b.id, { system: v as ScoringSystem })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["4pt", "10pt", "g78"] as ScoringSystem[]).map((s) => <SelectItem key={s} value={s}>{systemLabel[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="label-caps mb-1.5">Acceptance limit ({systemUnit[b.system]})</div>
                    <Input type="number" value={b.limit} onChange={(e) => updateBuyer(b.id, { limit: Number(e.target.value) || 0 })} />
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
      </Tabs>
    </div>
  );
}
