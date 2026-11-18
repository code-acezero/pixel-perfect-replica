import { cn } from "@/lib/utils";

/**
 * TensoraMark — 3D Brand Emblem
 * High-resolution aerodynamic 'T' mark with metallic & cyan optical facets.
 * Rendered directly with transparent background and no bounding container.
 */
export function TensoraMark({
  className = "h-8 w-auto",
  alt = "Tensora Logo",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src="/tensora-logo.png"
      alt={alt}
      className={cn(
        "h-8 w-auto object-contain shrink-0 select-none drop-shadow-[0_2px_10px_rgba(14,165,233,0.3)]",
        className
      )}
      draggable={false}
    />
  );
}

/**
 * Wordmark — Tensora Brand Display
 * Clean, modern industrial typography without extra AI/vision labels.
 */
export function Wordmark({
  compact = false,
  centered = false,
  className = "",
}: {
  compact?: boolean;
  centered?: boolean;
  className?: string;
}) {
  if (centered) {
    return (
      <div className={cn("flex flex-col items-center text-center select-none", className)}>
        <TensoraMark className="h-10 w-auto mb-2" />
        <div className="font-sans text-[15px] font-bold tracking-[0.2em] text-foreground">
          TENSORA
        </div>
        <div className="mt-0.5 font-mono text-[9px] tracking-[0.2em] text-muted-foreground">
          BY <span className="text-foreground/80">ARANEID</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <TensoraMark className="h-7 w-auto" />
      {!compact && (
        <div className="min-w-0 leading-none select-none">
          <div className="font-sans text-[15px] font-bold tracking-[0.2em] text-foreground">
            TENSORA
          </div>
          <div className="mt-1 font-mono text-[9px] tracking-[0.2em] text-muted-foreground">
            BY <span className="text-foreground/80">ARANEID</span>
          </div>
        </div>
      )}
    </div>
  );
}
