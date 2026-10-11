import type { Defect } from "@/lib/tensora/data";
import { cn } from "@/lib/utils";

/** Roll map: length on X, width on Y. Shows suggested cut positions around major clusters. */
export function RollMap({ defects, lengthM, showCuts = false }: { defects: Defect[]; lengthM: number; showCuts?: boolean }) {
  const len = Math.max(lengthM, 1);
  const majors = defects.filter((d) => d.points >= 3 && d.status !== "dismissed");
  const ticks = Array.from({ length: 6 }, (_, i) => Math.round((len / 5) * i));
  return (
    <div>
      <div className="relative h-28 overflow-hidden rounded-md border border-border bg-surface-2 tech-grid">
        {showCuts &&
          majors.map((d) => (
            <div
              key={`cut-${d.id}`}
              className="absolute inset-y-0 border-x border-dashed border-major/50 bg-major/5"
              style={{ left: `${Math.max(((d.meter - 1) / len) * 100, 0)}%`, width: `${(2 / len) * 100}%` }}
            />
          ))}
        {defects.map((d) => (
          <div
            key={d.id}
            title={`${d.id} · ${d.cls} · ${d.points} pt @ ${d.meter.toFixed(1)} m`}
            className={cn(
              "absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background",
              d.status === "dismissed" ? "bg-muted-foreground/40" : d.points >= 3 ? "bg-major" : "bg-minor",
            )}
            style={{ left: `${(d.meter / len) * 100}%`, top: `${8 + d.x * 84}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
        {ticks.map((t) => (
          <span key={t}>{t} m</span>
        ))}
      </div>
      {showCuts && (
        <p className="mt-2 text-xs text-muted-foreground">
          Dashed zones are suggested cut positions ({majors.length}). Remaining panels grade as first quality.
        </p>
      )}
    </div>
  );
}
