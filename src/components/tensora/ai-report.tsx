import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { writeRollReport, type RollReport } from "@/lib/tensora/ai.functions";
import { rollStats, useTensora } from "@/lib/tensora/store";
import { Panel } from "./ui";

export function AiReport({ rollId }: { rollId: string }) {
  const defects = useTensora((s) => s.defects);
  const rolls = useTensora((s) => s.rolls);
  const buyers = useTensora((s) => s.buyers);
  const write = useServerFn(writeRollReport);
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<RollReport | null>(null);

  const run = async () => {
    const s = rollStats({ defects, rolls, buyers }, rollId);
    setBusy(true);
    try {
      setR(await write({ data: { rollId, score: +s.score.toFixed(2), limit: s.buyer.limit, system: s.buyer.system } }));
    } catch {
      setR({ headline: "", summary: "", rootCauses: [], actions: [], buyerNote: "", error: "Couldn't reach the report service" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Tensora AI Inspection Narrative"
      action={
        <Button size="sm" variant="outline" className="gap-2 print:hidden" onClick={run} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BrainCircuit className="h-3.5 w-3.5 text-telemetry" />}
          {r ? "Regenerate" : "Write report"}
        </Button>
      }
    >
      {!r && !busy && <p className="text-sm text-muted-foreground">Generate an engineer-style summary of this roll: defect clusters, likely root causes and corrective actions.</p>}
      {busy && <p className="font-mono text-xs text-telemetry">Analysing defect map…</p>}
      {r?.error && <p className="text-sm text-major">{r.error}</p>}
      {r && !r.error && (
        <div className="space-y-3 text-sm">
          <div className="font-semibold">{r.headline}</div>
          <p className="text-muted-foreground">{r.summary}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><div className="label-caps mb-1">Likely root causes</div><ul className="list-disc space-y-1 pl-4">{r.rootCauses.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><div className="label-caps mb-1">Corrective actions</div><ul className="list-disc space-y-1 pl-4">{r.actions.map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>
          <p className="rounded border border-border bg-surface-2 p-2 text-xs"><span className="label-caps mr-2">Buyer note</span>{r.buyerNote}</p>
          <p className="text-[10px] text-muted-foreground">AI-generated from recorded inspection data. Review before sharing.</p>
        </div>
      )}
    </Panel>
  );
}
