import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, Flame, Layers, RefreshCw, Scan, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { DEFECT_CLASSES, DEFAULT_POINTS, DEFECT_TRANSLATIONS_BN, type Defect, type DefectClass } from "@/lib/tensora/data";
import { useTensora } from "@/lib/tensora/store";
import { SeverityBadge, Tag, fmtDateTime, fmtTime } from "./ui";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/tensora/use-can";

function statusTone(s: Defect["status"]) {
  return s === "confirmed" ? "pass" : s === "dismissed" ? "default" : s === "reclassified" ? "telemetry" : "minor";
}

function astmClauseForPoints(pts: number) {
  switch (pts) {
    case 1:
      return "ASTM D5430 Clause 8.1.1: Defects up to 3 inches (75 mm) in length or width.";
    case 2:
      return "ASTM D5430 Clause 8.1.2: Defects between 3 and 6 inches (75 mm - 150 mm).";
    case 3:
      return "ASTM D5430 Clause 8.1.3: Defects between 6 and 9 inches (150 mm - 230 mm).";
    case 4:
    default:
      return "ASTM D5430 Clause 8.1.4: Defects over 9 inches (230 mm) or any structural holes/slubs.";
  }
}

function Thumb({ d, onClick }: { d: Defect; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative h-12 w-16 shrink-0 overflow-hidden rounded-md border border-border/80 bg-surface-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-telemetry hover:scale-105 active:scale-95 hover:shadow-[0_4px_16px_-2px_rgba(6,182,212,0.35)] focus:outline-none cursor-pointer"
      title="Click to inspect defect in high resolution"
    >
      {d.thumb ? (
        <img src={d.thumb} alt={`${d.cls} crop`} className="h-full w-full object-cover transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110" />
      ) : (
        <div className="relative h-full w-full tech-grid">
          <div
            className={cn("absolute rounded-full", d.points >= 3 ? "bg-major/70" : "bg-minor/70")}
            style={{
              left: `${20 + (d.x * 40)}%`,
              top: "30%",
              width: d.cls === "Needle Line" ? 2 : 10,
              height: d.cls === "Needle Line" ? 36 : 10,
            }}
          />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[0.5px] transition-opacity group-hover:opacity-100">
        <Eye className="h-3.5 w-3.5 text-foreground" />
      </div>
    </button>
  );
}

function Reclassify({ d }: { d: Defect }) {
  const reclassify = useTensora((s) => s.reclassify);
  const [cls, setCls] = useState<DefectClass>(d.cls);
  const [pts, setPts] = useState(String(d.points));
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Reclassify</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="end">
        <div className="label-caps">Reclassify {d.id}</div>
        <Select value={cls} onValueChange={(v) => { setCls(v as DefectClass); setPts(String(DEFAULT_POINTS[v as DefectClass])); }}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>{DEFECT_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={pts} onValueChange={setPts}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>{[1, 2, 3, 4].map((p) => <SelectItem key={p} value={String(p)}>{p} point{p > 1 ? "s" : ""}</SelectItem>)}</SelectContent>
        </Select>
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            reclassify(d.id, cls, Number(pts));
            setOpen(false);
            toast.success(`${d.id} reclassified as ${cls} (${pts} pt)`);
          }}
        >
          Apply
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function Actions({ d, onInspect }: { d: Defect; onInspect?: () => void }) {
  const setStatus = useTensora((s) => s.setDefectStatus);
  const allowed = useCan("review");

  return (
    <div className="flex items-center justify-end gap-1.5">
      {onInspect && (
        <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={onInspect} title="Open Defect Lightbox Inspector">
          <Eye className="h-3.5 w-3.5" /> <span className="hidden xl:inline">Inspect</span>
        </Button>
      )}
      {allowed ? (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 border-pass/40 px-2 text-xs text-pass hover:bg-pass/10 hover:text-pass"
            onClick={() => { setStatus(d.id, "confirmed"); toast.success(`${d.id} confirmed and saved to few-shot training pool`); }}
          >
            <Check className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Confirm</span>
          </Button>
          <Reclassify d={d} />
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => { setStatus(d.id, "dismissed"); toast(`${d.id} dismissed — removed from score`); }}
          >
            <X className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Dismiss</span>
          </Button>
        </>
      ) : (
        <div className="text-right text-[10px] text-muted-foreground">{d.reviewer ? `by ${d.reviewer}` : "Awaiting QC"}</div>
      )}
    </div>
  );
}

interface DefectInspectorModalProps {
  defect: Defect | null;
  allDefects: Defect[];
  onClose: () => void;
  onSelect: (id: string) => void;
}

function DefectInspectorModal({ defect, allDefects, onClose, onSelect }: DefectInspectorModalProps) {
  const [showXai, setShowXai] = useState(false);
  const setStatus = useTensora((s) => s.setDefectStatus);
  const reclassify = useTensora((s) => s.reclassify);
  const rolls = useTensora((s) => s.rolls);
  const canReview = useCan("review");

  const [editCls, setEditCls] = useState<DefectClass>(defect ? defect.cls : "Hole");
  const [editPts, setEditPts] = useState(defect ? String(defect.points) : "4");

  useEffect(() => {
    if (defect) {
      setEditCls(defect.cls);
      setEditPts(String(defect.points));
    }
  }, [defect]);

  // Keyboard navigation through defects list
  useEffect(() => {
    if (!defect) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const idx = allDefects.findIndex((x) => x.id === defect.id);
        if (idx > 0 && allDefects[idx - 1]) onSelect(allDefects[idx - 1]!.id);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const idx = allDefects.findIndex((x) => x.id === defect.id);
        if (idx >= 0 && idx < allDefects.length - 1 && allDefects[idx + 1]) onSelect(allDefects[idx + 1]!.id);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [defect, allDefects, onSelect]);

  if (!defect) return null;

  const currentIdx = allDefects.findIndex((x) => x.id === defect.id);
  const prevDefect = currentIdx > 0 ? (allDefects[currentIdx - 1] ?? null) : null;
  const nextDefect = currentIdx >= 0 && currentIdx < allDefects.length - 1 ? (allDefects[currentIdx + 1] ?? null) : null;
  const roll = rolls.find((r) => r.id === defect.rollId);
  const rollWidth = roll?.widthIn ?? 58;
  const crossWebInches = (defect.x * rollWidth).toFixed(1);

  return (
    <Dialog open={!!defect} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-surface/95 border-border/80 text-foreground backdrop-blur-2xl shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7),0_0_25px_-5px_rgba(6,182,212,0.2)]">
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-base font-bold text-primary">{defect.id}</span>
              <span className="font-mono text-xs text-muted-foreground">· Roll {defect.rollId}</span>
              <SeverityBadge points={defect.points} />
              <Tag tone={statusTone(defect.status)}>{defect.status}</Tag>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{currentIdx + 1} of {allDefects.length} defects</span>
              <span className="hidden sm:inline font-mono text-[10px] bg-surface-2 px-1.5 py-0.5 rounded border border-border">← / → to step</span>
            </div>
          </div>
          <DialogTitle className="sr-only">Defect Inspection Lightbox for {defect.id}</DialogTitle>
          <DialogDescription className="sr-only">Detailed spatial and optical analysis of defect {defect.id}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Visual Optical / XAI Inspection View */}
          <div className="p-6 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="label-caps flex items-center gap-1.5">
                <Scan className="h-3.5 w-3.5 text-telemetry" />
                Optical Spatial Frame
              </span>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Flame className={cn("h-3.5 w-3.5", showXai ? "text-major" : "text-muted-foreground")} />
                <span className="text-[11px] font-mono">XAI Heatmap</span>
                <Switch checked={showXai} onCheckedChange={setShowXai} aria-label="Toggle XAI Heatmap" />
              </label>
            </div>

            {/* High-Resolution Fabric Frame with Reticle */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-border bg-surface-2 tech-grid flex items-center justify-center">
              {defect.thumb ? (
                <img
                  src={defect.thumb}
                  alt={`${defect.cls} inspection crop`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="relative h-full w-full flex items-center justify-center">
                  {/* Simulated High-Res Fabric Grain */}
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px]" />
                  {/* Defect Feature */}
                  <div
                    className={cn(
                      "relative rounded-sm shadow-lg",
                      defect.points >= 3 ? "bg-major/80 border-2 border-major" : "bg-minor/80 border-2 border-minor",
                    )}
                    style={{
                      width: defect.cls === "Needle Line" ? 4 : defect.cls === "Hole" ? 48 : 72,
                      height: defect.cls === "Needle Line" ? 180 : defect.cls === "Hole" ? 48 : 36,
                    }}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-background/90 px-1 font-mono text-[9px] text-foreground border border-border">
                      {defect.cls} ({defect.points} pt)
                    </div>
                  </div>
                </div>
              )}

              {/* XAI Saliency Heatmap Layer */}
              {showXai && (
                <div
                  className="pointer-events-none absolute inset-0 mix-blend-screen opacity-75"
                  style={{
                    background: `radial-gradient(circle at ${30 + (defect.x * 40)}% 50%, rgba(239, 68, 68, 0.85) 0%, rgba(245, 158, 11, 0.6) 35%, rgba(59, 130, 246, 0.2) 65%, transparent 80%)`,
                  }}
                />
              )}

              {/* Spatial Reticle Crosshairs */}
              <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-telemetry/40" />
              <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-telemetry/40" />

              {/* Coordinates Pill */}
              <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded bg-background/90 px-2 py-1 font-mono text-[10px] text-muted-foreground border border-border backdrop-blur">
                <span>L: {defect.meter.toFixed(2)} m</span>
                <span>·</span>
                <span>W: {crossWebInches}&quot; ({Math.round(defect.x * 100)}%)</span>
                <span>·</span>
                <span className="text-telemetry">{Math.round(defect.confidence * 100)}% Conf</span>
              </div>
            </div>

            {/* Loom Cross-Web Position Bar */}
            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>Left Selvedge (0&quot;)</span>
                <span>Loom Width: {rollWidth}&quot; ({defect.x > 0.5 ? "Right" : "Left"} half)</span>
                <span>Right Selvedge ({rollWidth}&quot;)</span>
              </div>
              <div className="relative h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 w-2.5 -translate-x-1/2 rounded-full bg-telemetry shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                  style={{ left: `${Math.max(Math.min(defect.x * 100, 98), 2)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Telemetry, Standards & Human Review Decision */}
          <div className="p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div>
                <div className="label-caps mb-1">Standard & Severity Classification</div>
                <div className="rounded-md border border-border bg-surface-2 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{defect.cls}</span>
                    <span className="font-mono text-xs text-primary">{defect.points} Penalty Points</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {astmClauseForPoints(defect.points)}
                  </p>
                  {defect.originalCls && (
                    <div className="mt-1 font-mono text-[10px] text-telemetry">
                      Reclassified from: {defect.originalCls}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="label-caps mb-1">Inference Telemetry</div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-border bg-surface-2/60 p-2">
                    <dt className="text-muted-foreground text-[10px]">Model Pipeline</dt>
                    <dd className="font-mono font-medium text-foreground">TX-Vision Edge (Few-Shot)</dd>
                  </div>
                  <div className="rounded border border-border bg-surface-2/60 p-2">
                    <dt className="text-muted-foreground text-[10px]">Confidence</dt>
                    <dd className="font-mono font-medium text-foreground">{(defect.confidence * 100).toFixed(1)}%</dd>
                  </div>
                  <div className="rounded border border-border bg-surface-2/60 p-2">
                    <dt className="text-muted-foreground text-[10px]">Timestamp</dt>
                    <dd className="font-mono text-[11px] text-foreground">{fmtDateTime(defect.ts)}</dd>
                  </div>
                  <div className="rounded border border-border bg-surface-2/60 p-2">
                    <dt className="text-muted-foreground text-[10px]">Source / Reviewer</dt>
                    <dd className="font-mono text-[11px] text-foreground">{defect.reviewer ?? defect.source ?? "AI Edge"}</dd>
                  </div>
                </dl>
              </div>

              {/* Reclassification Controls */}
              {canReview && (
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="label-caps">Reclassification Override</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={editCls} onValueChange={(v) => { setEditCls(v as DefectClass); setEditPts(String(DEFAULT_POINTS[v as DefectClass])); }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEFECT_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={editPts} onValueChange={setEditPts}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map((p) => <SelectItem key={p} value={String(p)}>{p} point{p > 1 ? "s" : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {(editCls !== defect.cls || Number(editPts) !== defect.points) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs border-telemetry/40 text-telemetry hover:bg-telemetry/10"
                      onClick={() => {
                        reclassify(defect.id, editCls, Number(editPts));
                        toast.success(`${defect.id} reclassified as ${editCls} (${editPts} pt)`);
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Save Reclassification
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Decision & Action Bar */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!canReview}
                  className="flex-1 bg-pass hover:bg-pass/90 text-primary-foreground font-medium text-xs gap-1"
                  onClick={() => {
                    setStatus(defect.id, "confirmed");
                    toast.success(`${defect.id} confirmed and saved to training pool`);
                    if (nextDefect) onSelect(nextDefect.id);
                  }}
                >
                  <Check className="h-4 w-4" /> Confirm Defect
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canReview}
                  className="flex-1 border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 text-xs gap-1"
                  onClick={() => {
                    setStatus(defect.id, "dismissed");
                    toast(`${defect.id} dismissed — removed from scoring`);
                    if (nextDefect) onSelect(nextDefect.id);
                  }}
                >
                  <X className="h-4 w-4" /> Dismiss
                </Button>
              </div>

              {/* Navigation Between Defects */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs gap-1"
                  disabled={!prevDefect}
                  onClick={() => prevDefect && onSelect(prevDefect.id)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </Button>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {currentIdx + 1} / {allDefects.length}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs gap-1"
                  disabled={!nextDefect}
                  onClick={() => nextDefect && onSelect(nextDefect.id)}
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DefectLedger({
  defects,
  showRoll = false,
  empty = "No defects in this view.",
  onInspectDefect,
}: {
  defects: Defect[];
  showRoll?: boolean;
  empty?: string;
  onInspectDefect?: (defect: Defect) => void;
}) {
  const language = useTensora((s) => s.language);
  const [activeDefectId, setActiveDefectId] = useState<string | null>(null);

  const activeDefect = activeDefectId ? defects.find((d) => d.id === activeDefectId) ?? null : null;

  const handleOpenInspector = (d: Defect) => {
    setActiveDefectId(d.id);
    onInspectDefect?.(d);
  };

  if (defects.length === 0) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{empty}</div>;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {["Crop", "Timestamp", "ID", ...(showRoll ? ["Roll"] : []), "Meter", "Defect class", "Severity", "Confidence", "Status", ""].map((h) => (
                <th key={h} className="label-caps px-2 py-2 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {defects.map((d) => (
              <tr key={d.id} className={cn("border-b border-border/60 hover:bg-accent/40 transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]", d.status === "dismissed" && "opacity-50")}>
                <td className="px-2 py-2">
                  <Thumb d={d} onClick={() => handleOpenInspector(d)} />
                </td>
                <td className="px-2 font-mono text-xs">{fmtTime(d.ts)}</td>
                <td className="px-2 font-mono text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => handleOpenInspector(d)}
                    className="hover:text-primary hover:underline focus:outline-none"
                  >
                    {d.id}
                  </button>
                </td>
                {showRoll && <td className="px-2 font-mono text-xs text-primary">{d.rollId}</td>}
                <td className="px-2 font-mono text-xs">{d.meter.toFixed(1)} m</td>
                <td className="px-2">
                  <div className="font-medium text-xs">
                    {language === "bn" ? (DEFECT_TRANSLATIONS_BN[d.cls]?.bn || d.cls) : d.cls}
                  </div>
                  {d.zone && <div className="text-[10px] text-muted-foreground">{d.zone}</div>}
                  {d.originalCls && <div className="text-[10px] text-muted-foreground">was {d.originalCls}</div>}
                  {d.source === "manual" && <div className="text-[10px] text-telemetry">manual</div>}
                </td>
                <td className="px-2"><SeverityBadge points={d.points} /></td>
                <td className="px-2 font-mono text-xs">{(d.confidence * 100).toFixed(1)}%</td>
                <td className="px-2"><Tag tone={statusTone(d.status)}>{d.status}</Tag></td>
                <td className="px-2">
                  <Actions d={d} onInspect={() => handleOpenInspector(d)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2.5 md:hidden">
        {defects.map((d) => (
          <div key={d.id} className={cn("liquid-card rounded-xl border border-border/70 bg-surface-2/90 backdrop-blur-md p-3.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.5),0_0_16px_-4px_rgba(6,182,212,0.2)]", d.status === "dismissed" && "opacity-50")}>
            <div className="flex gap-3">
              <Thumb d={d} onClick={() => handleOpenInspector(d)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenInspector(d)}
                    className="truncate font-medium text-left hover:text-primary text-xs"
                  >
                    {language === "bn" ? (DEFECT_TRANSLATIONS_BN[d.cls]?.bn || d.cls) : d.cls}
                  </button>
                  <SeverityBadge points={d.points} />
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {d.id} · {d.meter.toFixed(1)} m · {(d.confidence * 100).toFixed(1)}% · {fmtTime(d.ts)}
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <Tag tone={statusTone(d.status)}>{d.status}</Tag>
                  <button
                    type="button"
                    onClick={() => handleOpenInspector(d)}
                    className="font-mono text-[10px] text-telemetry flex items-center gap-1 hover:underline"
                  >
                    <Eye className="h-3 w-3" /> Inspect
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 border-t border-border pt-2">
              <Actions d={d} onInspect={() => handleOpenInspector(d)} />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Inspector Dialog */}
      <DefectInspectorModal
        defect={activeDefect}
        allDefects={defects}
        onClose={() => setActiveDefectId(null)}
        onSelect={(id) => setActiveDefectId(id)}
      />
    </>
  );
}
