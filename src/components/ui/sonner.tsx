import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-right"
      offset={16}
      gap={8}
      closeButton
      duration={4000}
      className="toaster group font-sans"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-mono text-xs font-semibold",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-mono text-xs font-medium",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
