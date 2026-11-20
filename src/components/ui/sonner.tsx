import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-right"
      gap={8}
      closeButton
      duration={3200}
      className="toaster group font-sans z-[9999]"
      toastOptions={{
        classNames: {
          toast:
            "group toast relative group-[.toaster]:bg-surface-2/95 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border/90 group-[.toaster]:rounded-xl group-[.toaster]:shadow-[0_14px_30px_rgba(0,0,0,0.75),inset_1px_1px_1.5px_rgba(255,255,255,0.12),inset_-1.5px_-1.5px_2px_rgba(0,0,0,0.5)] group-[.toaster]:p-3 sm:group-[.toaster]:p-3.5 group-[.toaster]:w-full sm:group-[.toaster]:w-auto group-[.toaster]:min-w-0 sm:group-[.toaster]:min-w-[300px] group-[.toaster]:max-w-full sm:group-[.toaster]:max-w-[420px]",
          title: "text-xs sm:text-sm font-semibold tracking-tight text-foreground",
          description: "group-[.toast]:text-muted-foreground text-[11px] sm:text-xs mt-0.5 leading-snug",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-mono text-[10px] sm:text-xs font-semibold h-7 px-2.5 rounded-md",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-mono text-[10px] sm:text-xs font-medium h-7 px-2.5 rounded-md",
          closeButton: "group-[.toast]:bg-surface group-[.toast]:border-border/80 group-[.toast]:text-muted-foreground hover:group-[.toast]:text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
