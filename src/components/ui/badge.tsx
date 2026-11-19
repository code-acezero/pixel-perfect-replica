import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold select-none shadow-[inset_1px_1px_1px_rgba(255,255,255,0.1),1px_1.5px_0px_rgba(0,0,0,0.6)] transition-all duration-200 ease-[cubic-bezier(0.18,0.9,0.28,1)] hover:-translate-y-0.5 active:scale-95 focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-primary/80 bg-primary text-primary-foreground hover:bg-primary/95",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:bg-secondary/90",
        destructive:
          "border-destructive/80 bg-destructive text-destructive-foreground hover:bg-destructive/95",
        outline:
          "border-border/90 bg-surface text-foreground hover:border-primary/50 hover:bg-surface-2",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
