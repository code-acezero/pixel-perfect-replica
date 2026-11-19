import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-xl border border-border/80 bg-surface-2 px-3 py-1 text-base shadow-[inset_2px_2px_4px_rgba(0,0,0,0.65),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] transition-all duration-200 ease-[cubic-bezier(0.18,0.9,0.28,1)] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:border-primary/80 focus-visible:ring-1 focus-visible:ring-primary focus-visible:shadow-[inset_2.5px_2.5px_5px_rgba(0,0,0,0.7),0_0_0_1px_var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
