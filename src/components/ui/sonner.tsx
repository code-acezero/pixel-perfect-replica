import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-right"
      offset={{ top: 58, right: 36 }}
      gap={8}
      closeButton
      duration={3500}
      className="toaster group font-sans z-[9999]"
      toastOptions={{
        classNames: {
          toast:
            "group toast relative group-[.toaster]:bg-surface-2/95 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border/90 group-[.toaster]:rounded-xl group-[.toaster]:shadow-[0_14px_30px_rgba(0,0,0,0.75),inset_1px_1px_1.5px_rgba(255,255,255,0.12),inset_-1.5px_-1.5px_2px_rgba(0,0,0,0.5)] group-[.toaster]:p-3 group-[.toaster]:min-w-[210px] group-[.toaster]:max-w-[290px]",
          title: "text-xs font-semibold tracking-tight text-foreground whitespace-nowrap",
          description: "group-[.toast]:text-muted-foreground text-[11px] mt-0.5 leading-snug whitespace-nowrap",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-mono text-[10px] font-semibold h-6 px-2 rounded-md",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-mono text-[10px] font-medium h-6 px-2 rounded-md",
          closeButton: "group-[.toast]:bg-surface group-[.toast]:border-border/80 group-[.toast]:text-muted-foreground hover:group-[.toast]:text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
