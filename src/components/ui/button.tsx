import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer overflow-hidden select-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-6px_rgba(6,182,212,0.3)] active:scale-[0.95] active:translate-y-0.5 active:duration-75 active:ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:shadow-[0_8px_24px_-4px_rgba(6,182,212,0.45)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-[0_8px_24px_-4px_rgba(239,68,68,0.45)]",
        outline:
          "border border-input bg-background/90 shadow-sm hover:border-primary/50 hover:bg-accent hover:text-accent-foreground hover:shadow-[0_6px_18px_-4px_rgba(6,182,212,0.2)]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-[0_6px_18px_-4px_rgba(0,0,0,0.4)]",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        link: "text-primary underline-offset-4 hover:underline hover:translate-y-0 hover:shadow-none",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8 text-base",
        icon: "h-9 w-9",
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
        {/* Iridescent oil-slick sheen on hover */}
        <span
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-full"
          aria-hidden="true"
        />

        {/* Dynamic liquid water ripple on click */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="pointer-events-none absolute rounded-full bg-white/20 animate-[liquid-ripple_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards]"
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
