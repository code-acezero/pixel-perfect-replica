export function TensoraMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="5" className="fill-surface-2 stroke-border" />
      <path d="M8 9h16M16 9v15" className="stroke-primary" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M9 16l7 8 7-8" className="stroke-telemetry/50" strokeWidth="1.2" fill="none" />
      <circle cx="16" cy="9" r="2" className="fill-primary" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <TensoraMark className="h-8 w-8 shrink-0" />
      {!compact && (
        <div className="min-w-0 leading-none">
          <div className="font-display text-base font-bold tracking-[0.22em] text-foreground">TENSORA</div>
          <div className="mt-1 font-mono text-[9px] tracking-[0.2em] text-muted-foreground">
            BY <span className="text-foreground/80">ARANEID</span>
          </div>
        </div>
      )}
    </div>
  );
}
