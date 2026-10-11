import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, Tag } from "@/components/tensora/ui";
import { useTensora, rollStats } from "@/lib/tensora/store";

export const Route = createFileRoute("/trace/")({
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
  const rolls = state.rolls.filter((r) => `${r.id} ${r.article} ${r.lot}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader module="Tensora Trace" title="Roll & Lot Register" description="Every roll, every inspection, every location." />
      <Panel title={`${rolls.length} rolls`} action={<Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search roll, lot, article" className="h-8 w-48 text-xs" />} bodyClassName="p-0">
        <div className="divide-y divide-border">
          {rolls.map((r) => {
            const s = rollStats(state, r.id);
            return (
              <Link key={r.id} to="/trace/$rollId" params={{ rollId: r.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-accent/30 md:grid-cols-[1fr_1.4fr_1fr_1fr_auto]">
                <div className="min-w-0">
                  <div className="font-mono text-sm text-primary">{r.id}</div>
                  <div className="truncate text-xs text-muted-foreground md:hidden">{r.article}</div>
                </div>
                <div className="hidden min-w-0 md:block">
                  <div className="truncate text-sm">{r.article}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{r.gsm} GSM · {r.widthIn} in · {r.lengthM.toFixed(1)} m</div>
                </div>
                <div className="hidden font-mono text-xs md:block">{r.lot}<div className="text-muted-foreground">{r.site}</div></div>
                <div className="hidden text-xs md:block">{s.buyer.name}<div className="font-mono text-muted-foreground">{s.score.toFixed(1)} / {s.buyer.limit}</div></div>
                <div className="flex flex-col items-end gap-1">
                  <Tag tone={s.pass ? "pass" : "major"}>{s.pass ? "Pass" : "Reject"}</Tag>
                  <Tag>{r.status}</Tag>
                </div>
              </Link>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
