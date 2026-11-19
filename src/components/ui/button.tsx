import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium cursor-pointer overflow-hidden select-none transition-all duration-250 ease-[cubic-bezier(0.18,0.9,0.28,1)] active:scale-[0.97] active:duration-80 active:ease-[cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary/80 shadow-[inset_1.5px_1.5px_2px_rgba(255,255,255,0.2),inset_-2px_-2px_4px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.5)] hover:bg-primary/95 hover:-translate-y-0.5 hover:shadow-[inset_1.5px_1.5px_2px_rgba(255,255,255,0.25),inset_-2px_-2px_4px_rgba(0,0,0,0.45),0_6px_16px_rgba(0,0,0,0.6)] active:translate-y-0.5 active:shadow-[inset_2px_2.5px_5px_rgba(0,0,0,0.6),inset_-1px_-1px_2px_rgba(255,255,255,0.1),0_1px_3px_rgba(0,0,0,0.4)]",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive/80 shadow-[inset_1.5px_1.5px_2px_rgba(255,255,255,0.2),inset_-2px_-2px_4px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.5)] hover:bg-destructive/90 hover:-translate-y-0.5 hover:shadow-[inset_1.5px_1.5px_2px_rgba(255,255,255,0.25),inset_-2px_-2px_4px_rgba(0,0,0,0.45),0_6px_16px_rgba(0,0,0,0.6)] active:translate-y-0.5 active:shadow-[inset_2px_2.5px_5px_rgba(0,0,0,0.6),inset_-1px_-1px_2px_rgba(255,255,255,0.1),0_1px_3px_rgba(0,0,0,0.4)]",
        outline:
          "border border-border/90 bg-surface text-foreground shadow-[inset_1px_1px_2px_rgba(255,255,255,0.08),inset_-1px_-1px_2px_rgba(0,0,0,0.35),0_2px_6px_rgba(0,0,0,0.35)] hover:border-primary/60 hover:bg-surface-2 hover:-translate-y-0.5 hover:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.12),inset_-1px_-1px_2px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.45)] active:translate-y-0.5 active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.55),0_1px_2px_rgba(0,0,0,0.3)]",
        secondary:
          "bg-secondary text-secondary-foreground border border-border/80 shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.12),inset_-1.5px_-2px_3px_rgba(0,0,0,0.45),0_3px_10px_rgba(0,0,0,0.4)] hover:bg-secondary/90 hover:-translate-y-0.5 hover:shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.15),inset_-1.5px_-2px_3px_rgba(0,0,0,0.5),0_5px_14px_rgba(0,0,0,0.5)] active:translate-y-0.5 active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6),inset_-1px_-1px_2px_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.4)]",
        ghost: "hover:bg-surface-2 hover:text-accent-foreground active:bg-surface-2/80 active:translate-y-0.5",
        link: "text-primary underline-offset-4 hover:underline hover:translate-y-0",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-xl px-8 text-base",
        icon: "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

interface Ripple {
  x: number;
  y: number;
  size: number;
  id: number;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, children, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<Ripple[]>([]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!asChild) {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const diameter = Math.max(rect.width, rect.height) * 2;
        const x = e.clientX - rect.left - diameter / 2;
        const y = e.clientY - rect.top - diameter / 2;

        const newRipple: Ripple = {
          x,
          y,
          size: diameter,
          id: Date.now() + Math.random(),
        };

        setRipples((prev) => [...prev.slice(-3), newRipple]);

        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
        }, 600);
      }

      onClick?.(e);
    };

    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} onClick={onClick} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }), "group")}
        ref={ref}
        onClick={handleClick}
        {...props}
      >
        {/* Dynamic fluid hydraulic ripple on click */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="pointer-events-none absolute rounded-full bg-white/12 animate-[hydraulic-ripple_0.55s_cubic-bezier(0.18,0.9,0.28,1)_forwards]"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
            }}
            aria-hidden="true"
          />
        ))}

        <span className="relative z-10 inline-flex items-center justify-center gap-2">
          {children}
        </span>
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
