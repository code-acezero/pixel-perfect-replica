import { cn } from "@/lib/utils";

/** Semi-circular gauge. max defaults to 2× limit. */
export function ScoreGauge({
  value,
  limit,
  unit,
  max,
}: {
  value: number;
  limit: number;
  unit: string;
  max?: number;
}) {
  const m = max ?? limit * 2;
  const pct = Math.min(value / m, 1);
  const limitPct = Math.min(limit / m, 1);
  const r = 80;
  const c = Math.PI * r;
  const pass = value <= limit;
  const angle = Math.PI * (1 - limitPct);
  const lx = 100 + Math.cos(angle) * r;
  const ly = 100 - Math.sin(angle) * r;
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <svg viewBox="0 0 200 115" className="w-full">
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" className="stroke-secondary" strokeWidth="14" />
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          strokeWidth="14"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={cn("transition-all duration-700", pass ? "stroke-pass" : "stroke-major")}
        />
        <line x1={lx} y1={ly} x2={100 + Math.cos(angle) * 96} y2={100 - Math.sin(angle) * 96} className="stroke-foreground" strokeWidth="2" />
        <text x={100 + Math.cos(angle) * 104} y={100 - Math.sin(angle) * 104} textAnchor="middle" className="fill-muted-foreground font-mono text-[8px]">
          {limit}
        </text>
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className={cn("font-mono text-4xl font-bold tabular-nums", pass ? "text-pass" : "text-major")}>
          {value.toFixed(1)}
        </div>
        <div className="label-caps">{unit}</div>
      </div>
    </div>
  );
}
