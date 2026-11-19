import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
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
    <div className="panel p-4 transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.5),0_0_16px_-4px_rgba(6,182,212,0.2)]">
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
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[11px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 active:scale-95",
        major ? "border-major/40 bg-major/10 text-major" : "border-minor/40 bg-minor/10 text-minor",
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
    pass: "border-pass/40 bg-pass/10 text-pass",
    minor: "border-minor/40 bg-minor/10 text-minor",
    major: "border-major/40 bg-major/10 text-major",
    telemetry: "border-telemetry/40 bg-telemetry/10 text-telemetry",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 active:scale-95",
        cls,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function VerdictBadge({ pass, large = false }: { pass: boolean; large?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border font-mono font-bold tracking-wide transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01]",
        large ? "px-4 py-3 text-sm shadow-md" : "px-2 py-1 text-[11px]",
        pass ? "border-pass/50 bg-pass/15 text-pass shadow-[0_0_15px_-3px_rgba(16,185,129,0.25)]" : "pulse-major border-major/60 bg-major/15 text-major shadow-[0_0_20px_-2px_rgba(239,68,68,0.35)]",
      )}
    >
      {pass ? "STATUS: PASS (Export Ready)" : "STATUS: REJECT (Penalty Threshold Exceeded)"}
    </div>
  );
}

export function fmtTime(ts: number) {
  return new Date(ts).toISOString().slice(11, 19);
}
export function fmtDateTime(ts: number) {
  return new Date(ts).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
