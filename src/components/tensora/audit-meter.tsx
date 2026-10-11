import { useTensora, rollStats } from "@/lib/tensora/store";
import { systemLabel, systemUnit } from "@/lib/tensora/scoring";
import { ScoreGauge } from "./gauge";
import { Panel, VerdictBadge } from "./ui";
import { cn } from "@/lib/utils";

export function AuditMeter({ rollId }: { rollId: string }) {
  const state = useTensora();
  const { roll, buyer, points, score, breakdown, pass } = rollStats(state, rollId);
  return (
    <Panel title={`${systemLabel[buyer.system]} Audit Meter`} action={<span className="font-mono text-[10px] text-muted-foreground">{buyer.name} · limit {buyer.limit}</span>}>
      <ScoreGauge value={score} limit={buyer.limit} unit={systemUnit[buyer.system]} />
      <div className="mt-4">
        <VerdictBadge pass={pass} large />
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["Inspected", `${roll.lengthM.toFixed(1)} m`],
          ["Width", `${roll.widthIn} in`],
          ["Penalty", `${points} pts`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-border bg-surface-2 px-2 py-2">
            <dt className="label-caps">{k}</dt>
            <dd className="mt-1 font-mono text-sm font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4">
        <div className="label-caps mb-2">Severity breakdown</div>
        <div className="grid grid-cols-4 gap-2">
          {breakdown.map((n, i) => (
            <div key={i} className={cn("rounded-md border px-2 py-2 text-center", i >= 2 ? "border-major/40 bg-major/10" : "border-minor/40 bg-minor/10")}>
              <div className={cn("font-mono text-[10px] font-semibold", i >= 2 ? "text-major" : "text-minor")}>{i + 1} PT</div>
              <div className="font-mono text-lg font-bold tabular-nums">{n}</div>
            </div>
          ))}
        </div>
      </div>
      {buyer.system === "4pt" && <p className="mt-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
        Score = (Points × 3600) ÷ (Length yd × Width in) = ({points} × 3600) ÷ ({(roll.lengthM * 1.0936).toFixed(1)} × {roll.widthIn})
      </p>}
    </Panel>
  );
}
