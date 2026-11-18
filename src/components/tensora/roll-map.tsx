import { useMemo, useState } from "react";
import { Scissors, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import type { Defect } from "@/lib/tensora/data";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SeverityBadge, Tag } from "./ui";
import { cn } from "@/lib/utils";

interface RollMapProps {
  defects: Defect[];
  lengthM: number;
  widthIn?: number;
  showCuts?: boolean;
  onSelectDefect?: (defect: Defect) => void;
}

interface MergedCutZone {
  startM: number;
  endM: number;
  defectIds: string[];
}

/** Merges overlapping cut zones around major defects (default: 1m buffer before and after) */
function computeCutZones(majors: Defect[], rollLengthM: number): MergedCutZone[] {
  if (majors.length === 0) return [];

  // Sort by meter
  const sorted = [...majors].sort((a, b) => a.meter - b.meter);
  const rawIntervals = sorted.map((d) => ({
    start: Math.max(0, d.meter - 1.0),
    end: Math.min(rollLengthM, d.meter + 1.0),
    defectId: d.id,
  }));

  const merged: MergedCutZone[] = [];
  let current: MergedCutZone | null = null;

  for (const interval of rawIntervals) {
    if (!current) {
      current = { startM: interval.start, endM: interval.end, defectIds: [interval.defectId] };
    } else if (interval.start <= current.endM + 0.2) {
      // Overlapping or contiguous intervals
      current.endM = Math.max(current.endM, interval.end);
      current.defectIds.push(interval.defectId);
    } else {
      merged.push(current);
      current = { startM: interval.start, endM: interval.end, defectIds: [interval.defectId] };
    }
  }

  if (current) merged.push(current);
  return merged;
}

/** Roll map: 2D spatial representation with length on X, loom width on Y. Shows cut optimization and interactive defect inspection. */
export function RollMap({ defects, lengthM, widthIn = 58, showCuts = false, onSelectDefect }: RollMapProps) {
  const len = Math.max(lengthM, 1);
  const majors = useMemo(() => defects.filter((d) => d.points >= 3 && d.status !== "dismissed"), [defects]);
  const cutZones = useMemo(() => computeCutZones(majors, len), [majors, len]);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);

  // Yield calculations
  const totalScrapM = cutZones.reduce((acc, z) => acc + (z.endM - z.startM), 0);
  const usableLengthM = Math.max(0, len - totalScrapM);
  const yieldPercent = ((usableLengthM / len) * 100).toFixed(1);
  const contiguousPanels = cutZones.length + 1;

  const ticks = Array.from({ length: 6 }, (_, i) => Math.round((len / 5) * i));

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-3">
        {/* Spatial Map Canvas */}
        <div className="relative">
          {/* Selvedge Indicators */}
          <div className="absolute -top-4 inset-x-0 flex justify-between font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
            <span>Top Selvedge (0&quot;)</span>
            <span className="hidden sm:inline">Fabric Flow →</span>
            <span>Loom Width: {widthIn}&quot;</span>
          </div>

          <div className="relative mt-2 h-32 overflow-hidden rounded-md border border-border bg-surface-2 tech-grid select-none">
            {/* Cut Zones (Suggested excisions) */}
            {showCuts &&
              cutZones.map((z, idx) => {
                const leftPct = (z.startM / len) * 100;
                const widthPct = Math.max(((z.endM - z.startM) / len) * 100, 1.5);
                return (
                  <div
                    key={`zone-${idx}`}
                    className="group absolute inset-y-0 border-x-2 border-dashed border-major/60 bg-major/10 transition-colors hover:bg-major/20"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`Cut Zone ${idx + 1}: ${z.startM.toFixed(1)}m – ${z.endM.toFixed(1)}m (${(z.endM - z.startM).toFixed(1)}m scrap)`}
                  >
                    <div className="absolute top-1 left-1 flex items-center gap-0.5 rounded bg-background/90 px-1 font-mono text-[8px] text-major border border-major/40">
                      <Scissors className="h-2.5 w-2.5" />
                      <span>Cut {idx + 1}</span>
                    </div>
                  </div>
                );
              })}

            {/* Defect Markers */}
            {defects.map((d) => {
              const isDismissed = d.status === "dismissed";
              const isMajor = d.points >= 3;
              const leftPct = (d.meter / len) * 100;
              const topPct = 8 + d.x * 84;
              const crossIn = (d.x * widthIn).toFixed(1);

              return (
                <Popover
                  key={d.id}
                  open={selectedDefect?.id === d.id}
                  onOpenChange={(open) => setSelectedDefect(open ? d : null)}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onSelectDefect?.(d)}
                          className={cn(
                            "absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-sm transition-transform hover:scale-150 focus:outline-none focus:ring-2 focus:ring-telemetry cursor-pointer z-10",
                            isDismissed
                              ? "bg-muted-foreground/40 opacity-40"
                              : isMajor
                                ? "bg-major shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                                : "bg-minor shadow-[0_0_6px_rgba(245,158,11,0.6)]",
                          )}
                          style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                          aria-label={`Defect ${d.id}: ${d.cls} at ${d.meter.toFixed(1)}m`}
                        />
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-surface border border-border text-foreground p-2 text-xs shadow-md">
                      <div className="font-mono font-bold text-primary">{d.id} · {d.cls}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {d.meter.toFixed(1)} m · W: {crossIn}&quot; · {d.points} pt
                      </div>
                    </TooltipContent>
                  </Tooltip>

                  {/* Popover Detail Card on Click */}
                  <PopoverContent side="top" align="center" className="w-64 p-3 bg-surface border border-border shadow-xl">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-primary">{d.id}</span>
                        <SeverityBadge points={d.points} />
                      </div>
                      <div className="text-xs font-medium">{d.cls}</div>
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] text-muted-foreground bg-surface-2 p-2 rounded border border-border">
                        <div>Meter: <span className="text-foreground">{d.meter.toFixed(2)} m</span></div>
                        <div>Cross-Web: <span className="text-foreground">{crossIn}&quot;</span></div>
                        <div>Confidence: <span className="text-foreground">{(d.confidence * 100).toFixed(0)}%</span></div>
                        <div>Status: <span className="text-foreground capitalize">{d.status}</span></div>
                      </div>
                      {onSelectDefect && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDefect(null);
                            onSelectDefect(d);
                          }}
                          className="w-full rounded bg-primary/10 hover:bg-primary/20 text-primary py-1 text-xs font-medium transition-colors"
                        >
                          Open Inspection Lightbox
                        </button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>

          {/* Bottom Selvedge Indicator */}
          <div className="mt-1 flex justify-between font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
            <span>Bottom Selvedge</span>
            <span>Cross-Web Width</span>
          </div>
        </div>

        {/* Longitudinal Axis Scale */}
        <div className="flex justify-between border-t border-border pt-1 font-mono text-[10px] text-muted-foreground">
          {ticks.map((t) => (
            <span key={t}>{t} m</span>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-minor" />
            <span>Minor Flaw (1–2 pt)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-major" />
            <span>Major Flaw (3–4 pt, Cut Trigger)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
            <span>Dismissed Flaw</span>
          </div>
          {showCuts && (
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded border border-dashed border-major/60 bg-major/20" />
              <span>Suggested Cut Zone</span>
            </div>
          )}
        </div>

        {/* Usable First-Quality Cut Plan Summary */}
        {showCuts && (
          <div className="rounded-md border border-border bg-surface-2 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold">Automated Cut Optimization & Yield Plan</span>
              </div>
              <Tag tone={Number(yieldPercent) >= 95 ? "pass" : "minor"}>
                {yieldPercent}% First Quality Yield
              </Tag>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs text-muted-foreground pt-1">
              <div className="rounded border border-border/60 bg-background/50 p-2">
                <div className="text-[10px] uppercase">Gross Length</div>
                <div className="font-bold text-foreground text-sm">{len.toFixed(1)} m</div>
              </div>
              <div className="rounded border border-border/60 bg-background/50 p-2">
                <div className="text-[10px] uppercase">Cut Zones</div>
                <div className="font-bold text-major text-sm">{cutZones.length} Excisions</div>
              </div>
              <div className="rounded border border-border/60 bg-background/50 p-2">
                <div className="text-[10px] uppercase">Excised Scrap</div>
                <div className="font-bold text-foreground text-sm">{totalScrapM.toFixed(1)} m ({((totalScrapM / len) * 100).toFixed(1)}%)</div>
              </div>
              <div className="rounded border border-border/60 bg-background/50 p-2">
                <div className="text-[10px] uppercase">Saleable Panels</div>
                <div className="font-bold text-pass text-sm">{contiguousPanels} Rolls</div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Excising {cutZones.length} cut zone{cutZones.length !== 1 ? "s" : ""} removes all major structural flaws. All {contiguousPanels} remaining contiguous panels meet buyer Grade A acceptance thresholds.
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
