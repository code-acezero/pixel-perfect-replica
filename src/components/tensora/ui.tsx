import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useTensora } from "@/lib/tensora/store";
import { cn } from "@/lib/utils";

export function PageHeader({
  module,
  title,
  description,
  actions,
}: {
  module: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="label-caps text-primary">{module}</div>
        <h1 className="mt-1 truncate text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("panel overflow-hidden", className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <div className="label-caps min-w-0 truncate text-foreground/80">{title}</div>
          {action}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  unit,
  delta,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: string;
  tone?: "default" | "pass" | "minor" | "major" | "telemetry";
  icon?: LucideIcon;
}) {
  const toneCls = {
    default: "text-foreground",
    pass: "text-pass",
    minor: "text-minor",
    major: "text-major",
    telemetry: "text-telemetry",
  }[tone];
  return (
    <div className="panel p-4 transition-all duration-300 ease-[cubic-bezier(0.18,0.9,0.28,1)] hover:-translate-y-1 hover:border-primary/50 hover:shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.1),inset_-2px_-2px_4px_rgba(0,0,0,0.5),0_12px_28px_-6px_rgba(0,0,0,0.75)]">
      <div className="flex items-center justify-between">
        <span className="label-caps">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:scale-110" />}
      </div>
      <div className={cn("mt-2 font-mono text-2xl font-semibold tabular-nums", toneCls)}>
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
      </div>
      {delta && <div className="mt-1 text-xs text-muted-foreground">{delta}</div>}
    </div>
  );
}

export function SeverityBadge({ points }: { points: number }) {
  const major = points >= 3;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold select-none shadow-[inset_1px_1px_1px_rgba(255,255,255,0.1),1px_1.5px_0px_rgba(0,0,0,0.7)] transition-all duration-200 ease-[cubic-bezier(0.18,0.9,0.28,1)] hover:-translate-y-0.5 active:scale-95",
        major ? "border-major/80 bg-major/20 text-major" : "border-minor/80 bg-minor/20 text-minor",
      )}
    >
      {points} PT
    </span>
  );
}

export function Tag({
  tone = "default",
  children,
  className,
}: {
  tone?: "default" | "pass" | "minor" | "major" | "telemetry";
  children: ReactNode;
  className?: string;
}) {
  const cls = {
    default: "border-border bg-secondary text-secondary-foreground",
    pass: "border-pass/80 bg-pass/20 text-pass",
    minor: "border-minor/80 bg-minor/20 text-minor",
    major: "border-major/80 bg-major/20 text-major",
    telemetry: "border-telemetry/80 bg-telemetry/20 text-telemetry",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider select-none shadow-[inset_1px_1px_1px_rgba(255,255,255,0.08),1px_1px_0px_rgba(0,0,0,0.6)] transition-all duration-200 ease-[cubic-bezier(0.18,0.9,0.28,1)] hover:-translate-y-0.5 active:scale-95",
        cls,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function VerdictBadge({ pass, large = false }: { pass: boolean; large?: boolean }) {
  const language = useTensora((s) => s.language);
  const isBn = language === "bn";
  return (
    <div
      className={cn(
        "rounded-xl border-2 font-mono font-bold tracking-wide transition-all duration-250 ease-[cubic-bezier(0.18,0.9,0.28,1)] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.12),inset_-2px_-2px_4px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.5)]",
        large ? "px-4 py-3 text-sm" : "px-2 py-1 text-[11px]",
        pass ? "border-pass/80 bg-pass/20 text-pass" : "pulse-major border-major/80 bg-major/20 text-major",
      )}
    >
      {pass
        ? (isBn ? "স্ট্যাটাস: পাস (রপ্তানি উপযোগী / PASS)" : "STATUS: PASS (Export Ready)")
        : (isBn ? "স্ট্যাটাস: রিজেক্ট (ত্রুটির সীমা অতিক্রম / REJECT)" : "STATUS: REJECT (Penalty Threshold Exceeded)")}
    </div>
  );
}

export function fmtTime(ts: number) {
  return new Date(ts).toISOString().slice(11, 19);
}
export function fmtDateTime(ts: number) {
  return new Date(ts).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
