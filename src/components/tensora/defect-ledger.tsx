import { useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DEFECT_CLASSES, DEFAULT_POINTS, type Defect, type DefectClass } from "@/lib/tensora/data";
import { useTensora } from "@/lib/tensora/store";
import { SeverityBadge, Tag, fmtTime } from "./ui";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/tensora/use-can";

function Thumb({ d }: { d: Defect }) {
  if (d.thumb) return <img src={d.thumb} alt={`${d.cls} crop`} className="h-12 w-16 shrink-0 rounded-sm border border-border object-cover" />;
  return (
    <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-sm border border-border bg-surface-2 tech-grid">
      <div
        className={cn("absolute rounded-full", d.points >= 3 ? "bg-major/70" : "bg-minor/70")}
        style={{
          left: `${20 + (d.x * 40)}%`,
          top: "30%",
          width: d.cls === "Needle Line" ? 2 : 10,
          height: d.cls === "Needle Line" ? 40 : 10,
        }}
      />
    </div>
  );
}

function statusTone(s: Defect["status"]) {
  return s === "confirmed" ? "pass" : s === "dismissed" ? "default" : s === "reclassified" ? "telemetry" : "minor";
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

function Actions({ d }: { d: Defect }) {
  const setStatus = useTensora((s) => s.setDefectStatus);
  const allowed = useCan("review");
  if (!allowed) return <div className="text-right text-[10px] text-muted-foreground">{d.reviewer ? `by ${d.reviewer}` : "Awaiting QC"}</div>;
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button size="sm" variant="outline" className="h-8 gap-1 border-pass/40 px-2 text-xs text-pass hover:bg-pass/10 hover:text-pass" onClick={() => { setStatus(d.id, "confirmed"); toast.success(`${d.id} confirmed`); }}>
        <Check className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Confirm</span>
      </Button>
      <Reclassify d={d} />
      <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-xs text-muted-foreground" onClick={() => { setStatus(d.id, "dismissed"); toast(`${d.id} dismissed — removed from score`); }}>
        <X className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Dismiss</span>
      </Button>
    </div>
  );
}

export function DefectLedger({ defects, showRoll = false, empty = "No defects in this view." }: { defects: Defect[]; showRoll?: boolean; empty?: string }) {
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
              <tr key={d.id} className={cn("border-b border-border/60 hover:bg-accent/30", d.status === "dismissed" && "opacity-50")}>
                <td className="px-2 py-2"><Thumb d={d} /></td>
                <td className="px-2 font-mono text-xs">{fmtTime(d.ts)}</td>
                <td className="px-2 font-mono text-xs text-muted-foreground">{d.id}</td>
                {showRoll && <td className="px-2 font-mono text-xs text-primary">{d.rollId}</td>}
                <td className="px-2 font-mono text-xs">{d.meter.toFixed(1)} m</td>
                <td className="px-2">
                  {d.cls}
                  {d.originalCls && <div className="text-[10px] text-muted-foreground">was {d.originalCls}</div>}
                  {d.source === "manual" && <div className="text-[10px] text-telemetry">manual</div>}
                </td>
                <td className="px-2"><SeverityBadge points={d.points} /></td>
                <td className="px-2 font-mono text-xs">{(d.confidence * 100).toFixed(1)}%</td>
                <td className="px-2"><Tag tone={statusTone(d.status)}>{d.status}</Tag></td>
                <td className="px-2"><Actions d={d} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {defects.map((d) => (
          <div key={d.id} className={cn("rounded-md border border-border bg-surface-2 p-3", d.status === "dismissed" && "opacity-50")}>
            <div className="flex gap-3">
              <Thumb d={d} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{d.cls}</span>
                  <SeverityBadge points={d.points} />
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {d.id} · {d.meter.toFixed(1)} m · {(d.confidence * 100).toFixed(1)}% · {fmtTime(d.ts)}
                </div>
                <div className="mt-1"><Tag tone={statusTone(d.status)}>{d.status}</Tag></div>
              </div>
            </div>
            <div className="mt-3 border-t border-border pt-2"><Actions d={d} /></div>
          </div>
        ))}
      </div>
    </>
  );
}
