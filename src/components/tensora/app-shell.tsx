import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  Bell,
  Camera,
  ClipboardCheck,
  Activity,
  Menu,
  Radio,
  Search,
  Layers,
  FileBadge,
  Wrench,
  QrCode,
  ChevronDown,
  ChevronRight,
  Languages,
  Award,
  GitBranch,
  Lightbulb,
  BarChart3,
  Smartphone,
  Settings2,
  X,
  Sparkles,
} from "lucide-react";
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
import { Wordmark, TensoraMark } from "./brand";
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
          id="tensora-alerts-bell"
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
          className="flex h-8 items-center gap-1.5 rounded-full border border-border/80 bg-surface-2 pl-1 pr-1.5 sm:pr-2.5 text-xs shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.08),inset_-1px_-1.5px_2px_rgba(0,0,0,0.4),0_2px_5px_rgba(0,0,0,0.5)] hover:border-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 ease-[cubic-bezier(0.18,0.9,0.28,1)] cursor-pointer shrink-0"
          aria-label="Account"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/20 font-mono text-[10px] font-bold text-primary border border-primary/40">
            {me.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="hidden xl:inline max-w-[84px] truncate text-xs font-medium text-foreground">
            {firstName}
          </span>
          <ChevronDown className="hidden sm:inline h-3 w-3 text-muted-foreground" />
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
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md print:hidden">
      <div className="flex h-13 items-center justify-between gap-2 px-2.5 sm:px-4">
        {/* Left: Sidebar trigger, mobile branding & desktop breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <SidebarTrigger className="hidden md:inline-flex h-8 w-8 rounded-lg border border-border/80 bg-surface shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.08),inset_-1px_-1px_2px_rgba(0,0,0,0.4)]" />
          
          {/* Mobile-only branding: visible only when sidebar is hidden on small screens */}
          <div className="flex items-center gap-1.5 shrink-0 md:hidden">
            <Link to="/" className="flex items-center gap-2 select-none hover:opacity-90 transition-opacity">
              <TensoraMark className="h-7 w-auto" />
              <span className="font-sans text-[13px] font-bold tracking-[0.16em] text-foreground">
                TENSORA
              </span>
            </Link>
          </div>

          {/* Desktop breadcrumbs: shown on desktop next to sidebar toggle without duplicate logo */}
          <div className="hidden items-center gap-2 text-xs md:flex min-w-0">
            <span className="font-medium text-muted-foreground truncate max-w-[170px]">{SITE.name}</span>
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

        {/* Right: Tactile claymorphic action cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <SyncBadge />

          {/* Language Toggle: compact tactile pill on mobile, labeled on desktop */}
          <button
            type="button"
            onClick={() => {
              const next = language === "en" ? "bn" : "en";
              setLanguage(next);
              toast.success(next === "bn" ? "বাংলা মোড সক্রিয় (Bengali Mill Operator Mode)" : "Switched to English");
            }}
            className="flex h-8 items-center gap-1 rounded-full border border-border/80 bg-surface-2 px-2 sm:px-2.5 text-xs font-mono font-medium text-muted-foreground hover:text-foreground shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.08),inset_-1px_-1.5px_2px_rgba(0,0,0,0.4),0_2px_5px_rgba(0,0,0,0.5)] hover:border-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 ease-[cubic-bezier(0.18,0.9,0.28,1)] cursor-pointer"
            title="Toggle Language / ভাষা পরিবর্তন (English / বাংলা)"
          >
            <Languages className="h-3.5 w-3.5 text-telemetry" />
            <span className="font-semibold text-[11px] sm:text-xs">{language === "en" ? "EN" : "বাং"}</span>
          </button>

          {/* Search Button (Global Palette) */}
          <button
            onClick={onOpenCommand}
            className="flex h-8 items-center gap-1.5 rounded-full border border-border/80 bg-surface-2 px-2.5 sm:px-3 text-xs text-muted-foreground hover:text-foreground shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.6),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] hover:border-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 ease-[cubic-bezier(0.18,0.9,0.28,1)] cursor-pointer"
            title="Global Command Palette (Ctrl+K or ⌘K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">{isBn ? "অনুসন্ধান…" : "Search..."}</span>
            <kbd className="hidden sm:inline-flex h-4 items-center rounded border border-border px-1 font-mono text-[9px] text-muted-foreground/80 shadow-[1px_1px_0px_rgba(0,0,0,0.8)]">⌘K</kbd>
          </button>

          {/* Stream Mode Toggle: hidden on small mobile, visible sm+ (mobile controls it via Menu drawer) */}
          <button
            type="button"
            onClick={() => {
              const next = streamMode === "live" ? "sim" : "live";
              setStreamMode(next);
              toast.info(next === "live" ? (isBn ? "লাইভ ক্যামেরা স্ট্রিমে পরিবর্তিত হয়েছে" : "Stream switched to Live Camera") : (isBn ? "সিমুলেটেড ফ্যাক্টরি ফিডে পরিবর্তিত হয়েছে" : "Stream switched to Simulated Feed"));
            }}
            className={cn(
              "hidden sm:flex h-8 items-center rounded-full border px-3 text-xs font-mono font-medium hover:-translate-y-0.5 active:scale-95 transition-all duration-200 ease-[cubic-bezier(0.18,0.9,0.28,1)] cursor-pointer",
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

/**
 * MobileMenuDrawer — Claymorphic Bottom Sheet displaying all remaining navigation modules
 */
function MobileMenuDrawer({
  open,
  onClose,
  onOpenCommand,
}: {
  open: boolean;
  onClose: () => void;
  onOpenCommand: () => void;
}) {
  const path = usePath();
  const { rolls, activeRollId, streamMode, setStreamMode, language, setLanguage } = useTensora();
  const isBn = language === "bn";
  const roll = rolls.find((r) => r.id === activeRollId) ?? rolls[0] ?? { id: "TX-8829", article: "100% Combed Cotton Single Jersey" };

  // All remaining modules (the main 4: Command, Capture, Triage, Trace are directly on bottom nav)
  const remainingModules = [
    {
      to: "/grade",
      title: isBn ? "বায়ার গ্রেডিং" : "Buyer Grade",
      desc: isBn ? "ASTM D5430 ৪-পয়েন্ট সিস্টেম" : "ASTM D5430 4-point rating",
      icon: Award,
      tone: "text-primary border-primary/30",
    },
    {
      to: "/insight",
      title: isBn ? "ফ্যাক্টরি ইনসাইট" : "Factory Insight",
      desc: isBn ? "AI ক্লাস্টার অ্যালার্ট ও সুপারিশ" : "Defect clusters & loom alerts",
      icon: Lightbulb,
      tone: "text-telemetry border-telemetry/30",
    },
    {
      to: "/analytics",
      title: isBn ? "অ্যানালিটিক্স" : "Analytics",
      desc: isBn ? "ইল্ড SPC, প্যারেটো ও ট্রেন্ড" : "Yield SPC, Pareto & yardage",
      icon: BarChart3,
      tone: "text-pass border-pass/30",
    },
    {
      to: "/certify",
      title: isBn ? "কোয়ালিটি সার্টিফিকেট" : "Quality Certify",
      desc: isBn ? "বায়ার ক্রিপ্টোগ্রাফিক পাসপোর্ট" : "Cryptographic roll passport",
      icon: FileBadge,
      tone: "text-pass border-pass/30",
    },
    {
      to: "/devices",
      title: isBn ? "ডিভাইস ফ্লিট" : "Device Fleet",
      desc: isBn ? "রোভার ট্যাবলেট ও RTSP আইপিক্যাম" : "Companion rovers & RTSP cams",
      icon: Smartphone,
      tone: "text-minor border-minor/30",
    },
    {
      to: "/configuration",
      title: isBn ? "কনফিগারেশন" : "Configuration",
      desc: isBn ? "টলারেন্স ও মিল ERP ইন্টিগ্রেশন" : "Buyer tolerances & ERP hooks",
      icon: Settings2,
      tone: "text-muted-foreground border-border/80",
    },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden print:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Claymorphic Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-[32px] border-t border-white/15 bg-gradient-to-b from-[#192338] via-[#0f172a] to-[#090e1a] p-4 sm:p-5 shadow-[0_-16px_40px_rgba(0,0,0,0.85),inset_0_1.5px_2px_rgba(255,255,255,0.2)] pb-[calc(2.5rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-300">
        {/* Pull handle indicator */}
        <div className="mx-auto h-1.5 w-12 rounded-full bg-white/25 mb-3" />

        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3.5">
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <TensoraMark className="h-5 w-auto" />
              <span>{isBn ? "টেনসোরা ইকোসিস্টেম মেনু" : "Tensora Ecosystem Menu"}</span>
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {SITE.name} · {SITE.line.replace(/\s*\(.*\)/, "")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="clay-nav-btn grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Active Roll Banner (Claymorphic) */}
        <Link
          to="/trace/$rollId"
          params={{ rollId: roll.id }}
          onClick={onClose}
          className="clay-menu-card block p-3 mb-4 hover:border-primary/50 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-primary uppercase font-bold tracking-wider">
                  {isBn ? "সক্রিয় রোল" : "ACTIVE INSPECTION ROLL"}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-pass animate-pulse" />
              </div>
              <div className="font-bold text-xs text-foreground truncate mt-0.5">
                #{roll.id} · {roll.article}
              </div>
            </div>
            <div className="flex items-center gap-1 font-mono text-[11px] text-primary font-semibold shrink-0 ml-2">
              <span>{isBn ? "ট্রেস দেখুন" : "View"}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </Link>

        {/* Remaining Modules Heading */}
        <div className="label-caps text-[10px] text-muted-foreground/80 mb-2.5 px-0.5">
          {isBn ? "অন্যান্য মডিউল সমূহ (Remaining Modules)" : "Remaining Modules & Workflows"}
        </div>

        {/* Remaining Modules Grid (2 Columns) */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {remainingModules.map((m) => {
            const active = isActive(path, m.to);
            const Icon = m.icon;
            return (
              <Link
                key={m.to}
                to={m.to}
                onClick={onClose}
                className={cn(
                  "clay-menu-card flex flex-col p-3 transition-all cursor-pointer text-left",
                  active && "border-primary/60 bg-primary/10 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6),0_0_14px_rgba(6,182,212,0.3)]"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={cn("grid h-8 w-8 place-items-center rounded-xl border bg-surface-2/80 shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.1),inset_-1px_-1px_2px_rgba(0,0,0,0.4)]", m.tone)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {active && (
                    <span className="font-mono text-[9px] font-bold text-primary px-1.5 py-0.5 rounded-full bg-primary/20 border border-primary/40">
                      LIVE
                    </span>
                  )}
                </div>
                <div className="font-semibold text-xs text-foreground truncate">{m.title}</div>
                <div className="text-[10px] text-muted-foreground/80 truncate mt-0.5">{m.desc}</div>
              </Link>
            );
          })}
        </div>

        {/* Quick Operational Controls (Claymorphic) */}
        <div className="label-caps text-[10px] text-muted-foreground/80 mb-2 px-0.5">
          {isBn ? "কুইক কন্ট্রোলস (Hardware & System)" : "Quick Mobile Controls"}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {/* Stream Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = streamMode === "live" ? "sim" : "live";
              setStreamMode(next);
              toast.info(next === "live" ? (isBn ? "লাইভ ক্যামেরা স্ট্রিমে পরিবর্তিত হয়েছে" : "Switched to Live Camera") : (isBn ? "সিমুলেশনে পরিবর্তিত হয়েছে" : "Switched to Simulated Feed"));
            }}
            className="clay-menu-card flex items-center gap-2 p-2.5 text-left cursor-pointer"
          >
            <Radio className={cn("h-4 w-4 shrink-0", streamMode === "live" ? "text-primary" : "text-muted-foreground")} />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-[11px] text-foreground truncate">
                {streamMode === "live" ? (isBn ? "লাইভ ক্যামেরা" : "Live Camera") : (isBn ? "সিমুলেশন" : "Sim Stream")}
              </div>
              <div className="text-[9px] text-muted-foreground font-mono">
                {streamMode === "live" ? "Edge Sensor" : "Sample Feed"}
              </div>
            </div>
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => {
              const next = language === "en" ? "bn" : "en";
              setLanguage(next);
              toast.success(next === "bn" ? "বাংলা মোড সক্রিয়" : "Switched to English");
            }}
            className="clay-menu-card flex items-center gap-2 p-2.5 text-left cursor-pointer"
          >
            <Languages className="h-4 w-4 shrink-0 text-telemetry" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-[11px] text-foreground truncate">
                {language === "en" ? "English" : "বাংলা"}
              </div>
              <div className="text-[9px] text-muted-foreground font-mono">
                {language === "en" ? "Switch to বাংলা" : "Switch to EN"}
              </div>
            </div>
          </button>
        </div>

        {/* Global Search Shortcut in Menu */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenCommand();
          }}
          className="clay-menu-card mt-2.5 flex w-full items-center justify-between p-2.5 text-left text-xs cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-telemetry" />
            <span>{isBn ? "কমান্ড প্যালেট ও রোল অনুসন্ধান (⌘K)" : "Global Command & Roll Search (⌘K)"}</span>
          </div>
          <kbd className="h-4.5 rounded border border-border px-1 font-mono text-[9px] text-muted-foreground">⌘K</kbd>
        </button>
      </div>
    </div>
  );
}

/**
 * BottomNav — Claymorphism Mobile Navigation
 * Features 4 primary modules + 1 "Menu" button revealing all remaining options
 */
function BottomNav({ onOpenCommand }: { onOpenCommand: () => void }) {
  const path = usePath();
  const language = useTensora((s) => s.language);
  const isBn = language === "bn";
  const [menuOpen, setMenuOpen] = useState(false);

  // Close drawer upon navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  // Main 4 buttons as requested
  const mainItems = [
    { to: "/", label: isBn ? "কমান্ড" : "Command", icon: Activity },
    { to: "/capture", label: isBn ? "ক্যাপচার" : "Capture", icon: Camera, isCenter: true },
    { to: "/triage", label: isBn ? "ট্রায়াজ" : "Triage", icon: ClipboardCheck },
    { to: "/trace", label: isBn ? "ট্রেস" : "Trace", icon: GitBranch },
  ];

  const remainingRoutes = ["/grade", "/insight", "/analytics", "/certify", "/devices", "/configuration"];
  const isInsideMenuRoute = remainingRoutes.some((r) => isActive(path, r));

  return (
    <>
      {/* Floating Claymorphic Bottom Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md clay-bottom-bar p-1.5 md:hidden print:hidden"
      >
        <div className="grid grid-cols-5 items-center gap-1">
          {mainItems.map((i) => {
            const active = isActive(path, i.to);
            const Icon = i.icon;
            return (
              <Link
                key={i.to}
                to={i.to}
                data-active={active}
                className={cn(
                  "clay-nav-btn flex flex-col items-center justify-center gap-1 py-1.5 px-1 text-[10px] font-medium tracking-tight",
                  active
                    ? "clay-nav-btn-active text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                  i.isCenter && !active && "bg-surface-2/60 border border-border/40"
                )}
              >
                <Icon className={cn("h-4.5 w-4.5 transition-transform duration-200", active && "scale-110", i.isCenter && "h-5 w-5")} />
                <span className="truncate max-w-[56px] leading-none">{i.label}</span>
              </Link>
            );
          })}

          {/* 5th option: "Menu" - Opens remaining modules */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            data-active={menuOpen || isInsideMenuRoute}
            className={cn(
              "clay-nav-btn flex flex-col items-center justify-center gap-1 py-1.5 px-1 text-[10px] font-medium tracking-tight cursor-pointer",
              menuOpen || isInsideMenuRoute
                ? "clay-nav-btn-active text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="All Remaining Navigation & Control Options"
          >
            <div className="relative">
              <Menu className={cn("h-4.5 w-4.5 transition-transform duration-200", (menuOpen || isInsideMenuRoute) && "scale-110")} />
              {isInsideMenuRoute && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              )}
            </div>
            <span className="truncate max-w-[56px] leading-none">{isBn ? "মেনু" : "Menu"}</span>
          </button>
        </div>
      </nav>

      {/* Claymorphic Mobile Drawer */}
      <MobileMenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenCommand={onOpenCommand}
      />
    </>
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
          <main className="flex-1 px-3 pb-24 pt-4 sm:px-6 sm:pt-6 md:pb-10 print:p-0 print:m-0 max-w-full overflow-x-hidden">{children}</main>
        </div>
      </div>
      <BottomNav onOpenCommand={() => setCommandOpen(true)} />
      <GlobalCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </SidebarProvider>
  );
}
