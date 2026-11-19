import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Bell, Camera, ClipboardCheck, Activity, Menu, Radio, MonitorPlay, Search, Layers, FileBadge, Wrench, QrCode, SlidersHorizontal, ChevronDown, Languages } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL } from "@/lib/tensora/permissions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { getNavGroups } from "./nav";
import { Wordmark } from "./brand";
import { useTensora } from "@/lib/tensora/store";
import { useTranslation } from "@/lib/tensora/i18n";
import { SITE } from "@/lib/tensora/data";
import { cn } from "@/lib/utils";
import { fmtTime } from "./ui";
import { useSync } from "@/lib/tensora/offline";

function SyncBadge() {
  const { online, pending, syncing } = useSync();
  const { t } = useTranslation();
  if (online && !pending) return null;
  return (
    <span
      className={cn(
        "hidden sm:inline-flex h-8 items-center rounded-full border px-3 font-mono text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 active:scale-95",
        online ? "border-telemetry/40 text-telemetry bg-telemetry/10 shadow-[0_0_12px_rgba(56,189,248,0.2)]" : "border-minor/50 text-minor bg-minor/10"
      )}
    >
      <span className={cn("mr-1.5 h-2 w-2 rounded-full", online ? (syncing ? "bg-telemetry animate-ping" : "bg-telemetry") : "bg-minor")} />
      <span>{online ? (syncing ? t("topbar.syncing") : t("topbar.queued")) : t("topbar.offline")}</span>
      {pending ? <span className="ml-1.5 font-bold">{pending}</span> : null}
    </span>
  );
}

function usePath() {
  return useRouterState({ select: (s) => s.location.pathname });
}

function isActive(path: string, to: string) {
  return to === "/" ? path === "/" : path === to || path.startsWith(to + "/");
}

function AppSidebar() {
  const path = usePath();
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const language = useTensora((s) => s.language);
  const isBn = language === "bn";
  const navGroups = useMemo(() => getNavGroups(language), [language]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3.5 py-3">
        <Wordmark compact={collapsed} />
      </SidebarHeader>
      <SidebarContent className="gap-1 py-1 px-1.5 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navGroups.map((g) => (
          <SidebarGroup key={g.label} className="p-0 pb-1">
            <SidebarGroupLabel className="h-6 px-2 text-[10px] font-mono font-semibold tracking-wider text-muted-foreground/50">
              {g.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(path, item.to)}
                      tooltip={item.module}
                      className="h-8 text-xs font-medium rounded-md transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1 active:scale-[0.98]"
                    >
                      <Link to={item.to} onClick={() => setOpenMobile(false)}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-3 py-2.5">
        {!collapsed && (
          <div className="font-mono text-[10px] leading-tight text-muted-foreground/75 select-none">
            <div className="truncate font-semibold text-foreground/80">
              {isBn ? "টেনসোরা v৩.৪.০ · এরানিড" : "Tensora v3.4.0 · TX-Vision-9"}
            </div>
            <div className="truncate text-[9px] text-muted-foreground/50 mt-0.5">
              {isBn ? "© এরানিড ইন্ডাস্ট্রিয়াল সিস্টেমস" : "© Araneid Industrial Systems"}
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function AlertsBell() {
  const alerts = useTensora((s) => s.alerts);
  const language = useTensora((s) => s.language);
  const isBn = language === "bn";
  const majors = alerts.filter((a) => a.level === "major").length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border/80 bg-surface-2 text-muted-foreground hover:text-foreground shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.08),inset_-1px_-1.5px_2px_rgba(0,0,0,0.4),0_2px_5px_rgba(0,0,0,0.5)] hover:border-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 ease-[cubic-bezier(0.18,0.9,0.28,1)] cursor-pointer"
          aria-label="Alerts"
        >
          <Bell className="h-3.5 w-3.5" />
          {majors > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-major px-0.5 font-mono text-[8px] font-bold text-destructive-foreground shadow-[1px_1px_0px_rgba(0,0,0,0.8)]">
              {majors}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-3 py-2 label-caps">
          {isBn ? "সক্রিয় সতর্কতা সমূহ" : "Active alerts"}
        </div>
        <div className="max-h-80 overflow-auto">
          {alerts.map((a) => (
            <Link key={a.id} to="/insight" className="block border-b border-border px-3 py-2.5 last:border-0 hover:bg-accent">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", a.level === "major" ? "bg-major" : a.level === "minor" ? "bg-minor" : "bg-telemetry")} />
                <span className="truncate text-sm font-medium">{a.title}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{fmtTime(a.ts)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UserMenu() {
  const me = useTensora((s) => s.me);
  const language = useTensora((s) => s.language);
  const isBn = language === "bn";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  if (!me) return null;
  const signOut = async () => {
    localStorage.removeItem("tensora_demo_user");
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  };
  const firstName = me.name.split(" ")[0] || me.name;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex h-8 items-center gap-1.5 rounded-full border border-border/80 bg-surface-2 pl-1 pr-2.5 text-xs shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.08),inset_-1px_-1.5px_2px_rgba(0,0,0,0.4),0_2px_5px_rgba(0,0,0,0.5)] hover:border-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 ease-[cubic-bezier(0.18,0.9,0.28,1)] cursor-pointer"
          aria-label="Account"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/20 font-mono text-[10px] font-bold text-primary border border-primary/40">
            {me.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="hidden xl:inline max-w-[84px] truncate text-xs font-medium text-foreground">
            {firstName}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="text-sm font-medium">{me.name}</div>
        <div className="truncate text-xs text-muted-foreground">{me.email}</div>
        <div className="mt-2 inline-block rounded border border-telemetry/40 px-1.5 py-0.5 font-mono text-[10px] text-telemetry">
          {ROLE_LABEL[me.role]}
        </div>
        <button onClick={signOut} className="mt-3 flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent cursor-pointer">
          <LogOut className="h-4 w-4" /> {isBn ? "লগ আউট (Sign out)" : "Sign out"}
        </button>
      </PopoverContent>
    </Popover>
  );
}

function TopBar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const { streamMode, setStreamMode, activeRollId, rolls, language, setLanguage } = useTensora();
  const isBn = language === "bn";
  const roll = rolls.find((r) => r.id === activeRollId) ?? rolls[0] ?? { id: activeRollId, article: "100% Combed Cotton Single Jersey", gsm: 180 };
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 print:hidden">
      <div className="flex h-13 items-center justify-between gap-3 px-3 sm:px-4">
        {/* Left: Sidebar trigger & compact breadcrumb context */}
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger className="hidden md:inline-flex h-8 w-8 rounded-lg border border-border/80 bg-surface shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.08),inset_-1px_-1px_2px_rgba(0,0,0,0.4)]" />
          <div className="md:hidden">
            <Wordmark />
          </div>
          <div className="hidden items-center gap-2 text-xs md:flex min-w-0">
            <span className="font-medium text-muted-foreground truncate max-w-[160px]">{SITE.name}</span>
            <span className="text-muted-foreground/30">/</span>
            <span className="font-mono text-muted-foreground text-[11px]">{SITE.line.replace(/\s*\(.*\)/, "")}</span>
            <span className="text-muted-foreground/30">/</span>
            <Link
              to="/trace/$rollId"
              params={{ rollId: roll.id }}
              className="inline-flex h-8 items-center rounded-full border border-primary/40 bg-surface px-3 font-mono text-xs font-semibold text-primary shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.1),inset_-1px_-1.5px_2px_rgba(0,0,0,0.4),0_2px_5px_rgba(0,0,0,0.5)] hover:bg-surface-2 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 ease-[cubic-bezier(0.18,0.9,0.28,1)] shrink-0"
              title={`Active roll: ${roll.id} · ${roll.article}`}
            >
              <span>{isBn ? `রোল #${roll.id}` : `Roll #${roll.id}`}</span>
            </Link>
          </div>
        </div>

        {/* Right: Sync, Language, Search, Stream toggle, Alerts, Profile */}
        <div className="flex items-center gap-2 shrink-0">
          <SyncBadge />
          <button
            type="button"
            onClick={() => {
              const next = language === "en" ? "bn" : "en";
              setLanguage(next);
              toast.success(next === "bn" ? "বাংলা মোড সক্রিয় (Bengali Mill Operator Mode)" : "Switched to English");
            }}
            className="flex h-8 items-center gap-1.5 rounded-full border border-border/80 bg-surface-2 px-2.5 text-xs font-mono font-medium text-muted-foreground hover:text-foreground shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.08),inset_-1px_-1.5px_2px_rgba(0,0,0,0.4),0_2px_5px_rgba(0,0,0,0.5)] hover:border-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 ease-[cubic-bezier(0.18,0.9,0.28,1)] cursor-pointer"
            title="Toggle Language / ভাষা পরিবর্তন (English / বাংলা)"
          >
            <Languages className="h-3.5 w-3.5 text-telemetry" />
            <span>{language === "en" ? "EN / বাং" : "বাং / EN"}</span>
          </button>
          <button
            onClick={onOpenCommand}
            className="flex h-8 items-center gap-2 rounded-full border border-border/80 bg-surface-2 px-3 text-xs text-muted-foreground hover:text-foreground shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.6),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] hover:border-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 ease-[cubic-bezier(0.18,0.9,0.28,1)] cursor-pointer"
            title="Global Command Palette (Ctrl+K or ⌘K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">{isBn ? "অনুসন্ধান…" : "Search..."}</span>
            <kbd className="hidden sm:inline-flex h-4 items-center rounded border border-border px-1 font-mono text-[9px] text-muted-foreground/80 shadow-[1px_1px_0px_rgba(0,0,0,0.8)]">⌘K</kbd>
          </button>
          <button
            type="button"
            onClick={() => {
              const next = streamMode === "live" ? "sim" : "live";
              setStreamMode(next);
              toast.info(next === "live" ? (isBn ? "লাইভ ক্যামেরা স্ট্রিমে পরিবর্তিত হয়েছে" : "Stream switched to Live Camera") : (isBn ? "সিমুলেটেড ফ্যাক্টরি ফিডে পরিবর্তিত হয়েছে" : "Stream switched to Simulated Feed"));
            }}
            className={cn(
              "flex h-8 items-center rounded-full border px-3 text-xs font-mono font-medium hover:-translate-y-0.5 active:scale-95 transition-all duration-200 ease-[cubic-bezier(0.18,0.9,0.28,1)] cursor-pointer",
              streamMode === "live"
                ? "border-primary/80 bg-primary/15 text-primary shadow-[inset_1px_1px_2px_rgba(255,255,255,0.15),inset_-1.5px_-1.5px_3px_rgba(0,0,0,0.5),0_2px_6px_rgba(6,182,212,0.3)]"
                : "border-border/80 bg-surface-2 text-muted-foreground hover:text-foreground shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.08),inset_-1px_-1.5px_2px_rgba(0,0,0,0.4),0_2px_5px_rgba(0,0,0,0.5)]"
            )}
            title={`Current: ${streamMode === "live" ? "Live Camera Feed" : "Simulated Factory Stream"}. Click to toggle.`}
          >
            <span>{isBn ? (streamMode === "live" ? "লাইভ ফিড" : "সিমুলেশন") : (streamMode === "live" ? "Live Feed" : "Sim Stream")}</span>
          </button>
          <AlertsBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function GlobalCommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { rolls, setActiveRoll, streamMode, setStreamMode, language } = useTensora();
  const isBn = language === "bn";
  const navGroups = useMemo(() => getNavGroups(language), [language]);

  const handleSelect = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={isBn ? "কমান্ড লিখুন, রোল খুঁজুন অথবা মডিউলে যান..." : "Type a command, search rolls, or jump to module..."} />
      <CommandList>
        <CommandEmpty>{isBn ? "কোনো মিল খুঁজে পাওয়া যায়নি।" : "No matching command or inventory found."}</CommandEmpty>

        <CommandGroup heading={isBn ? "দ্রুত অ্যাকশন (Quick Actions)" : "Quick Actions"}>
          <CommandItem onSelect={() => handleSelect(() => navigate({ to: "/capture", search: { tab: "live" } }))}>
            <Camera className="mr-2 h-4 w-4 text-telemetry" />
            <span>{isBn ? "লাইভ অপটিক্যাল ইন্সপেকশন শুরু করুন" : "Start Live Optical Inspection Station"}</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate({ to: "/capture", search: { tab: "setup" } }))}>
            <QrCode className="mr-2 h-4 w-4 text-primary" />
            <span>{isBn ? "রোল টিকিট স্ক্যান / তৈরি করুন" : "Scan / Create Roll Ticket"}</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate({ to: "/certify" }))}>
            <FileBadge className="mr-2 h-4 w-4 text-pass" />
            <span>{isBn ? "ক্রিপ্টোগ্রাফিক কোয়ালিটি সার্টিফিকেট ইস্যু করুন" : "Issue Cryptographic Quality Certificate"}</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate({ to: "/devices" }))}>
            <Wrench className="mr-2 h-4 w-4 text-minor" />
            <span>{isBn ? "ক্যামেরা ডিভাইস সংযুক্ত করুন (ফোন, ট্যাবলেট, USB, IP)" : "Pair Camera Device (Phone, Tablet, USB, IP)"}</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => {
            const nextMode = streamMode === "live" ? "sim" : "live";
            setStreamMode(nextMode);
            toast.info(nextMode === "live" ? (isBn ? "লাইভ ক্যামেরা ফিডে পরিবর্তিত হয়েছে" : "Stream switched to Live Camera") : (isBn ? "সিমুলেটেড ফিডে পরিবর্তিত হয়েছে" : "Stream switched to Simulated Feed"));
          })}>
            <Radio className="mr-2 h-4 w-4 text-telemetry" />
            <span>{isBn ? `স্ট্রীম মোড পরিবর্তন (বর্তমান: ${streamMode === "live" ? "লাইভ" : "সিমুলেশন"})` : `Toggle Stream Mode (Currently: ${streamMode === "live" ? "Live" : "Simulated"})`}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={isBn ? "রোল ইনভেন্টরি রেজিস্টার" : "Roll Inventory Register"}>
          {rolls.slice(0, 8).map((r) => (
            <CommandItem
              key={r.id}
              value={`${r.id} ${r.article} ${r.lot} ${r.supplier}`}
              onSelect={() => handleSelect(() => {
                setActiveRoll(r.id);
                navigate({ to: "/trace/$rollId", params: { rollId: r.id } });
              })}
            >
              <Layers className="mr-2 h-4 w-4 text-primary" />
              <div className="flex flex-1 items-center justify-between">
                <span>
                  <b className="font-mono">{r.id}</b> · {r.article}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{r.lengthM.toFixed(0)}m · {r.status}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={isBn ? "নেভিগেশন (Navigation)" : "Navigation"}>
          {navGroups.flatMap((g) => g.items.map((item) => ({ ...item, group: g.label }))).map((item) => (
            <CommandItem
              key={item.to}
              value={`${item.title} ${item.group}`}
              onSelect={() => handleSelect(() => navigate({ to: item.to }))}
            >
              <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{item.title}</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground/60">{item.group}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function BottomNav() {
  const path = usePath();
  const { setOpenMobile } = useSidebar();
  const language = useTensora((s) => s.language);
  const isBn = language === "bn";
  const items = [
    { to: "/", label: isBn ? "কমান্ড" : "Command", icon: Activity },
    { to: "/capture", label: isBn ? "ক্যাপচার" : "Capture", icon: Camera },
    { to: "/triage", label: isBn ? "ট্রায়াজ" : "Triage", icon: ClipboardCheck },
    { to: "/insight", label: isBn ? "অ্যালার্ট" : "Alerts", icon: Bell },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden">
      {items.map((i) => (
        <Link
          key={i.to}
          to={i.to}
          className={cn(
            "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90",
            isActive(path, i.to) ? "text-primary scale-105" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <i.icon className="h-5 w-5" />
          {i.label}
        </Link>
      ))}
      <button onClick={() => setOpenMobile(true)} className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90 hover:text-foreground cursor-pointer">
        <Menu className="h-5 w-5" />
        {isBn ? "আরও" : "More"}
      </button>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <div className="print:hidden">
          <AppSidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onOpenCommand={() => setCommandOpen(true)} />
          <main className="flex-1 px-3 pb-24 pt-4 sm:px-6 sm:pt-6 md:pb-10 print:p-0 print:m-0">{children}</main>
        </div>
      </div>
      <BottomNav />
      <GlobalCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </SidebarProvider>
  );
}
