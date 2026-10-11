import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL } from "@/lib/tensora/permissions";
import { Bell, Camera, ClipboardCheck, Activity, Menu, Radio, MonitorPlay, Search } from "lucide-react";
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
import { NAV_GROUPS } from "./nav";
import { Wordmark } from "./brand";
import { useTensora } from "@/lib/tensora/store";
import { SITE } from "@/lib/tensora/data";
import { cn } from "@/lib/utils";
import { fmtTime } from "./ui";

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
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <Wordmark compact={collapsed} />
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="label-caps">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive(path, item.to)} tooltip={item.module}>
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
      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-2 py-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
            Tensora v3.4.0 · Edge model TX-Vision-9
            <br />© Araneid Industrial Systems
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function AlertsBell() {
  const alerts = useTensora((s) => s.alerts);
  const majors = alerts.filter((a) => a.level === "major").length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-surface-2 hover:bg-accent" aria-label="Alerts">
          <Bell className="h-4 w-4" />
          {majors > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-major px-1 font-mono text-[9px] font-bold text-destructive-foreground">
              {majors}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-3 py-2 label-caps">Active alerts</div>
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  if (!me) return null;
  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface-2 px-2 text-xs hover:bg-accent" aria-label="Account">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/20 font-mono text-[10px] font-bold text-primary">{me.name.slice(0, 2).toUpperCase()}</span>
          <span className="hidden max-w-[120px] truncate text-left sm:block">
            <span className="block truncate font-medium">{me.name}</span>
            <span className="block truncate text-[10px] text-muted-foreground">{ROLE_LABEL[me.role]}</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="text-sm font-medium">{me.name}</div>
        <div className="truncate text-xs text-muted-foreground">{me.email}</div>
        <div className="mt-2 inline-block rounded border border-telemetry/40 px-1.5 py-0.5 font-mono text-[10px] text-telemetry">{ROLE_LABEL[me.role]}</div>
        <button onClick={signOut} className="mt-3 flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </PopoverContent>
    </Popover>
  );
}

function TopBar() {
  const { streamMode, setStreamMode, activeRollId, rolls } = useTensora();
  const roll = rolls.find((r) => r.id === activeRollId)!;
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
        <SidebarTrigger className="hidden md:inline-flex" />
        <div className="md:hidden">
          <Wordmark />
        </div>
        <div className="hidden min-w-0 flex-1 items-center gap-4 lg:flex">
          <div className="min-w-0">
            <div className="label-caps">Site</div>
            <div className="truncate text-xs font-medium">{SITE.name} | {SITE.line}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="min-w-0">
            <div className="label-caps">Active roll</div>
            <div className="truncate text-xs font-medium">
              <span className="font-mono text-primary">Roll #{roll.id}</span> | {roll.article} ({roll.gsm} GSM)
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="hidden h-9 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-xs text-muted-foreground hover:bg-accent xl:flex">
            <Search className="h-3.5 w-3.5" /> Search rolls, defects… <kbd className="font-mono text-[10px]">⌘K</kbd>
          </button>
          <label className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 text-xs">
            {streamMode === "live" ? <Radio className="h-3.5 w-3.5 text-telemetry" /> : <MonitorPlay className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className="hidden sm:inline">{streamMode === "live" ? "Live Camera Feed" : "Simulated Factory Stream"}</span>
            <Switch checked={streamMode === "live"} onCheckedChange={(v) => setStreamMode(v ? "live" : "sim")} aria-label="Toggle live camera" />
          </label>
          <AlertsBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const path = usePath();
  const { setOpenMobile } = useSidebar();
  const items = [
    { to: "/", label: "Command", icon: Activity },
    { to: "/capture", label: "Capture", icon: Camera },
    { to: "/triage", label: "Triage", icon: ClipboardCheck },
    { to: "/insight", label: "Alerts", icon: Bell },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {items.map((i) => (
        <Link
          key={i.to}
          to={i.to}
          className={cn(
            "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
            isActive(path, i.to) ? "text-primary" : "text-muted-foreground",
          )}
        >
          <i.icon className="h-5 w-5" />
          {i.label}
        </Link>
      ))}
      <button onClick={() => setOpenMobile(true)} className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground">
        <Menu className="h-5 w-5" />
        More
      </button>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-3 pb-24 pt-4 sm:px-6 sm:pt-6 md:pb-10">{children}</main>
        </div>
      </div>
      <BottomNav />
    </SidebarProvider>
  );
}
