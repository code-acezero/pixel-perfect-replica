import { useState, useEffect, useMemo, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Shield,
  ShieldAlert,
  Sparkles,
  Calendar,
  Clock,
  Globe,
  Lock,
  Unlock,
  Download,
  Printer,
  Share2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu,
  Layers,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Briefcase,
  Mail,
  Zap,
  Activity,
  Award,
  Terminal,
  FileCode,
  Search,
  BookOpen,
  ArrowUpRight,
  SlidersHorizontal,
  RefreshCw,
  Eye,
  EyeOff,
  Flame,
  Camera,
  Play,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Wordmark } from "@/components/tensora/brand";
import { useTensora } from "@/lib/tensora/store";
import { useCan } from "@/lib/tensora/use-can";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_DOCS_ACCESS,
  CORE_TEAM,
  PITCH_DECK_CONTENT,
  TECH_DOCS_CONTENT,
  type DocsAccessConfig,
  type TeamMember,
} from "@/lib/tensora/docs-data";
import { SITE, DEFECT_CLASSES } from "@/lib/tensora/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Tensora — Live YC Pitch Deck & Technical Whitepaper" },
      {
        name: "description",
        content:
          "Official Y Combinator–style pitch deck, deep engineering whitepaper, and real-time live system ops for Tensora Textile AI.",
      },
      { property: "og:title", content: "Tensora AI — Camera-First Textile Inspection" },
      {
        property: "og:description",
        content: "Automated ASTM D5430 textile quality inspection on mobile devices with Gemini 3 multimodal vision and verifiable QR certificates.",
      },
    ],
  }),
  component: DocsPage,
});

export function DocsPage() {
  const navigate = useNavigate();
  const isAdmin = useCan("admin");
  const me = useTensora((s) => s.me);
  const rolls = useTensora((s) => s.rolls);
  const defects = useTensora((s) => s.defects);
  const activeRollId = useTensora((s) => s.activeRollId);
  const setMe = useTensora((s) => s.setMe);

  // 1. Persistent Access Control & Scheduling State
  const [accessConfig, setAccessConfig] = useState<DocsAccessConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("tensora_docs_access_settings");
        if (saved) return JSON.parse(saved) as DocsAccessConfig;
      } catch {}
    }
    return DEFAULT_DOCS_ACCESS;
  });

  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pitch" | "tech" | "ops">("pitch");

  // Save access config to localStorage
  const updateAccessConfig = (next: Partial<DocsAccessConfig>) => {
    const updated = { ...accessConfig, ...next, lastUpdated: new Date().toISOString() };
    setAccessConfig(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("tensora_docs_access_settings", JSON.stringify(updated));
    }
    toast.success("Docs access control settings updated and published");
  };

  // Evaluate whether public visitors currently have access
  const isAccessible = useMemo(() => {
    // Admin always has bypass access
    if (isAdmin || me?.role === "plant_admin" || me?.role === "quality_manager") return true;

    if (accessConfig.visibility === "public") return true;
    if (accessConfig.visibility === "admin_only") return false;

    // Scheduled access window check
    const now = Date.now();
    const start = new Date(accessConfig.scheduleStart).getTime();
    const end = new Date(accessConfig.scheduleEnd).getTime();
    return now >= start && now <= end;
  }, [isAdmin, me, accessConfig]);

  // Demo Admin Login for judges / reviewers when locked
  const loginAsDemoAdmin = () => {
    localStorage.setItem("tensora_demo_user", "1");
    setMe({
      id: "demo-lead-admin",
      name: "Tariqul Islam (Lead Admin)",
      email: "tariqul.qc@araneid.internal",
      role: "plant_admin",
      site: "ASH-U03",
    });
    toast.success("Authenticated as Plant Admin · Access Unlocked");
  };

  // Copy shareable link
  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/docs`);
      toast.success("Shareable documentation link copied to clipboard");
    }
  };

  // Export standalone markdown file
  const exportMarkdown = () => {
    const md = `# Tensora Textile AI — Live Pitch Deck & Technical Whitepaper
Version: ${accessConfig.publishedVersion} | Generated: ${new Date().toISOString()}

## Executive Summary
${PITCH_DECK_CONTENT.solution.headline}

### The Problem
${PITCH_DECK_CONTENT.problem.headline}
${PITCH_DECK_CONTENT.problem.points.map((p) => `- ${p}`).join("\n")}

### The Solution
${PITCH_DECK_CONTENT.solution.points.map((p) => `- ${p}`).join("\n")}

### Market Opportunity
- TAM: ${PITCH_DECK_CONTENT.marketSize.tam} — ${PITCH_DECK_CONTENT.marketSize.tamDesc}
- SAM: ${PITCH_DECK_CONTENT.marketSize.sam} — ${PITCH_DECK_CONTENT.marketSize.samDesc}
- SOM: ${PITCH_DECK_CONTENT.marketSize.som} — ${PITCH_DECK_CONTENT.marketSize.somDesc}

### Business Model & Unit Economics
- CAC: ${PITCH_DECK_CONTENT.businessModel.cac} | LTV: ${PITCH_DECK_CONTENT.businessModel.ltv} (${PITCH_DECK_CONTENT.businessModel.ratio})
${PITCH_DECK_CONTENT.businessModel.streams.map((s) => `- **${s.name}**: ${s.pricing} (${s.desc})`).join("\n")}

### Core Team
${CORE_TEAM.map((m) => `- **${m.name}** (${m.role}) — ${m.email}\n  ${m.bio}`).join("\n")}

## Technical Architecture
${TECH_DOCS_CONTENT.architecture.description}

### Layers
${TECH_DOCS_CONTENT.architecture.layers.map((l) => `- **${l.name}** [${l.tech}]: ${l.role}`).join("\n")}

### Endpoints
${TECH_DOCS_CONTENT.apiEndpoints.map((e) => `- \`${e.method} ${e.path}\` (${e.auth}): ${e.desc}`).join("\n")}
`;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Tensora-Pitch-and-Technical-Docs-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported full documentation as Markdown file");
  };

  // If outside scheduled window and visitor is not an admin, render the gatekeeper screen
  if (!isAccessible) {
    const startStr = new Date(accessConfig.scheduleStart).toUTCString();
    const endStr = new Date(accessConfig.scheduleEnd).toUTCString();

    return (
      <div className="min-h-screen bg-slate-950 text-foreground flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-xl rounded-2xl border border-border/80 bg-surface-2 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-primary to-amber-500" />
          
          <div className="flex items-center justify-between pb-6 border-b border-border/60">
            <Wordmark />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 font-mono text-xs font-semibold text-amber-300">
              <Lock className="h-3 w-3" /> Showcase Restricted
            </span>
          </div>

          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Showcase & Judging Window Scheduled
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The live documentation and YC pitch deck module is currently in private preparation mode and scheduled for official release during the judging review window.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface p-4 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-primary" /> Start Date:</span>
                <span className="text-white font-semibold">{startStr}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-400" /> End Date:</span>
                <span className="text-white font-semibold">{endStr}</span>
              </div>
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Default Window:</span>
                <span className="text-primary">June 10 (00:00) &rarr; June 14 (23:59)</span>
              </div>
            </div>

            <div className="rounded-lg bg-surface/60 border border-border/40 p-3 text-xs text-muted-foreground">
              <strong className="text-white font-medium">Judges & Authorized Reviewers:</strong> You can unlock immediate preview access below using authorized reviewer credentials or the 1-click Admin Inspector bypass.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-border/60">
            <Button
              onClick={loginAsDemoAdmin}
              className="flex-1 bg-primary text-primary-foreground font-semibold hover:brightness-110 cursor-pointer"
            >
              <Unlock className="h-4 w-4 mr-1.5" /> Unlock as Demo Reviewer
            </Button>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-md border border-border/80 bg-surface px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-2 transition-colors"
            >
              Staff Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-foreground font-sans selection:bg-primary/30 pb-20">
      {/* 1. Admin Live Control Ribbon (Visible to Admins or in Preview Mode) */}
      {(isAdmin || me?.role === "plant_admin" || me?.role === "quality_manager") && (
        <aside aria-label="Admin Access Controller" className="sticky top-0 z-50 border-b border-amber-500/30 bg-amber-950/90 text-amber-200 px-3 py-2 text-xs backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 border border-amber-500/40">
                <Shield className="h-3 w-3" /> ADMIN ACCESS CONTROLLER
              </span>
              <span className="hidden sm:inline text-amber-300/80">
                Current Mode: <strong className="text-white uppercase">{accessConfig.visibility}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAdminPanelOpen(!adminPanelOpen)}
                className="h-7 text-[11px] font-mono border-amber-500/40 bg-amber-500/20 text-white hover:bg-amber-500/30 cursor-pointer"
              >
                <SlidersHorizontal className="h-3 w-3 mr-1" />
                {adminPanelOpen ? "Close Controls" : "Edit Visibility & Schedule"}
              </Button>

              <button
                type="button"
                onClick={() => updateAccessConfig({ visibility: accessConfig.visibility === "public" ? "scheduled" : "public" })}
                className="h-7 px-2.5 rounded-md font-mono text-[11px] font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer"
              >
                {accessConfig.visibility === "public" ? "Set to Scheduled Window" : "Make Instantly Public"}
              </button>
            </div>
          </div>

          {/* Collapsible Admin Configuration Drawer */}
          {adminPanelOpen && (
            <div className="mt-2.5 pt-2.5 border-t border-amber-500/30 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-amber-300">Publishing Mode</label>
                <select
                  value={accessConfig.visibility}
                  onChange={(e) => updateAccessConfig({ visibility: e.target.value as DocsAccessConfig["visibility"] })}
                  className="mt-1 w-full rounded-md border border-amber-500/40 bg-slate-900 px-2 py-1 text-xs text-white"
                >
                  <option value="public">Always Public (Worldwide Access)</option>
                  <option value="scheduled">Scheduled Availability Window</option>
                  <option value="admin_only">Admin Only (Strict Locked)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-amber-300">Schedule Start (UTC)</label>
                <Input
                  type="datetime-local"
                  value={accessConfig.scheduleStart.slice(0, 16)}
                  onChange={(e) => updateAccessConfig({ scheduleStart: new Date(e.target.value).toISOString() })}
                  className="mt-1 h-7 text-xs bg-slate-900 border-amber-500/40 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-amber-300">Schedule End (UTC)</label>
                <Input
                  type="datetime-local"
                  value={accessConfig.scheduleEnd.slice(0, 16)}
                  onChange={(e) => updateAccessConfig({ scheduleEnd: new Date(e.target.value).toISOString() })}
                  className="mt-1 h-7 text-xs bg-slate-900 border-amber-500/40 text-white"
                />
              </div>

              <div className="md:col-span-3 flex items-center justify-between pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateAccessConfig(DEFAULT_DOCS_ACCESS)}
                  className="h-6 text-[10px] font-mono text-amber-300 hover:text-white"
                >
                  <RotateCcw className="h-2.5 w-2.5 mr-1" /> Reset to Default Judging Window (June 10–14)
                </Button>
                <span className="font-mono text-[10px] text-amber-400/80">
                  Default window: June 10 (00:00) &rarr; June 14 (23:59)
                </span>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* 2. Primary Documentation Header */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="hover:opacity-90 transition-opacity">
              <Wordmark />
            </Link>
            <span className="text-muted-foreground/40 hidden sm:inline">/</span>
            <span className="font-mono text-xs font-semibold text-primary hidden sm:inline">
              LIVE /DOCS
            </span>
          </div>

          {/* Quick Section View Selector */}
          <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-surface p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("pitch")}
              className={cn(
                "px-2.5 py-1 rounded-md font-mono text-[11px] sm:text-xs transition-all duration-150 cursor-pointer",
                activeTab === "pitch"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
              )}
            >
              🚀 YC Pitch Deck
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tech")}
              className={cn(
                "px-2.5 py-1 rounded-md font-mono text-[11px] sm:text-xs transition-all duration-150 cursor-pointer",
                activeTab === "tech"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
              )}
            >
              ⚙️ Technical Docs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ops")}
              className={cn(
                "px-2.5 py-1 rounded-md font-mono text-[11px] sm:text-xs transition-all duration-150 cursor-pointer",
                activeTab === "ops"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
              )}
            >
              📊 Live System Ops
            </button>
          </div>

          {/* Right Action Cluster: Export, Print, Share */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={exportMarkdown}
              title="Download Full Documentation as Markdown (.md)"
              className="h-8 text-xs font-mono hidden md:inline-flex cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 mr-1 text-primary" /> Markdown
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              title="Print / Save PDF Pitch Deck"
              className="h-8 text-xs font-mono hidden md:inline-flex cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-primary" /> PDF / Print
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={copyShareLink}
              title="Copy Shareable Link"
              className="h-8 w-8 sm:w-auto px-2 sm:px-2.5 text-xs font-mono cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5 sm:mr-1 text-primary" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            <Link
              to="/capture"
              className="h-8 px-3 rounded-md bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1 hover:brightness-110 transition-all cursor-pointer shadow-md"
            >
              <Camera className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Launch App</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 3. Live System Telemetry Banner */}
      <section aria-label="Plant Real-Time Telemetry" className="border-b border-border/60 bg-surface/80 py-2.5 px-4 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              SYSTEM ONLINE
            </span>
            <span>Plant: <strong className="text-white">{SITE.name}</strong></span>
            <span>Active Roll: <strong className="text-primary">{activeRollId}</strong></span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Total Rolls: <strong className="text-white">{rolls.length}</strong></span>
            <span>Total Defects: <strong className="text-white">{defects.length}</strong></span>
            <span>AI Model: <strong className="text-primary">gemini-3-flash-preview</strong></span>
          </div>
        </div>
      </section>

      {/* 4. Main Body Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-12">
        {/* ========================================================================= */}
        {/* TAB 1: YC-STYLE PITCH DECK                                                */}
        {/* ========================================================================= */}
        {activeTab === "pitch" && (
          <div className="space-y-12 animate-in fade-in duration-300">
            {/* Hero / Deck Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/40 bg-primary/10 font-mono text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> YC W26 PITCH DECK & EXECUTIVE SUMMARY
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Camera-First AI Vision for the <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">Zero-Waste Textile Factory</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Tensora replaces $80,000 bulky hardware inspection gantries with commodity mobile devices, rovers, and multi-modal edge vision—automating ASTM D5430 audits in real time.
              </p>
            </div>

            {/* Problem & Solution Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-destructive/40 bg-surface-2 p-6 sm:p-7 space-y-4 shadow-lg">
                <div className="flex items-center gap-2 text-destructive font-mono text-xs font-bold uppercase tracking-wider">
                  <ShieldAlert className="h-4 w-4" /> The Problem
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">{PITCH_DECK_CONTENT.problem.headline}</h2>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  {PITCH_DECK_CONTENT.problem.points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-destructive font-bold text-base leading-none">&times;</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-primary/40 bg-surface-2 p-6 sm:p-7 space-y-4 shadow-lg">
                <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" /> The Solution
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">{PITCH_DECK_CONTENT.solution.headline}</h2>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  {PITCH_DECK_CONTENT.solution.points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Traction & Market Metrics */}
            <div className="rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Pilot Plant Traction (Ashulia Mill — Unit 03)</h3>
                  <p className="text-xs text-muted-foreground">Live audited metrics across 4 active circular knitting lines</p>
                </div>
                <span className="font-mono text-xs px-2.5 py-1 rounded bg-surface-2 border border-border text-primary font-semibold">
                  AUDITED PILOT
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {PITCH_DECK_CONTENT.traction.metrics.map((m, i) => (
                  <div key={i} className="rounded-xl border border-border/60 bg-surface-2 p-4 space-y-1">
                    <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{m.value}</div>
                    <div className="text-xs font-medium text-foreground">{m.label}</div>
                    <div className="text-[10px] font-mono text-emerald-400 font-semibold">{m.change}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/60">
                <div className="rounded-xl bg-surface-2 p-4">
                  <div className="font-mono text-xs text-muted-foreground uppercase">TAM</div>
                  <div className="text-xl font-bold text-white font-mono">{PITCH_DECK_CONTENT.marketSize.tam}</div>
                  <p className="text-xs text-muted-foreground mt-1">{PITCH_DECK_CONTENT.marketSize.tamDesc}</p>
                </div>
                <div className="rounded-xl bg-surface-2 p-4">
                  <div className="font-mono text-xs text-muted-foreground uppercase">SAM</div>
                  <div className="text-xl font-bold text-primary font-mono">{PITCH_DECK_CONTENT.marketSize.sam}</div>
                  <p className="text-xs text-muted-foreground mt-1">{PITCH_DECK_CONTENT.marketSize.samDesc}</p>
                </div>
                <div className="rounded-xl bg-surface-2 p-4">
                  <div className="font-mono text-xs text-muted-foreground uppercase">SOM (Initial Focus)</div>
                  <div className="text-xl font-bold text-emerald-400 font-mono">{PITCH_DECK_CONTENT.marketSize.som}</div>
                  <p className="text-xs text-muted-foreground mt-1">{PITCH_DECK_CONTENT.marketSize.somDesc}</p>
                </div>
              </div>
            </div>

            {/* Competitive Matrix */}
            <div className="rounded-2xl border border-border/80 bg-surface-2 p-6 sm:p-8 space-y-4 overflow-hidden">
              <h3 className="text-lg font-bold text-white">Competitive Moat vs Legacy Systems</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/80 font-mono text-muted-foreground">
                      <th className="py-2.5 pr-4">Dimension</th>
                      <th className="py-2.5 px-4 text-primary font-bold">Tensora AI</th>
                      <th className="py-2.5 px-4">Uster EVS</th>
                      <th className="py-2.5 px-4">Cognex Gantry</th>
                      <th className="py-2.5 pl-4">Manual Human Inspection</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono">
                    {PITCH_DECK_CONTENT.competition.map((row, i) => (
                      <tr key={i} className="hover:bg-surface/50">
                        <td className="py-3 pr-4 font-sans font-medium text-foreground">{row.feature}</td>
                        <td className="py-3 px-4 text-primary font-semibold">{row.tensora}</td>
                        <td className="py-3 px-4 text-muted-foreground">{row.uster}</td>
                        <td className="py-3 px-4 text-muted-foreground">{row.cognex}</td>
                        <td className="py-3 pl-4 text-muted-foreground">{row.manual}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MANDATORY TEAM SHOWCASE SECTION */}
            <div id="team" className="rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    <Users className="h-4 w-4" /> Team & Leadership
                  </div>
                  <h3 className="text-2xl font-bold text-white mt-1">Founders & Core Engineering</h3>
                </div>
                <span className="font-mono text-xs px-3 py-1 rounded-full bg-surface-2 border border-border text-muted-foreground">
                  Team Araneid
                </span>
              </div>

              {/* Uniform Team Member Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {CORE_TEAM.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col rounded-xl border border-border/70 bg-surface-2 p-5 space-y-4 hover:border-primary/50 transition-all duration-200 group"
                  >
                    {/* Consistent Uniform Profile Picture Frame */}
                    <div className="flex items-center gap-3.5">
                      <div className="relative h-14 w-14 rounded-2xl overflow-hidden border-2 border-primary/30 shrink-0 bg-slate-900 shadow-md">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            // Clean fallback avatar with initials
                            e.currentTarget.style.display = "none";
                            e.currentTarget.parentElement!.innerHTML = `<div class="h-full w-full grid place-items-center font-mono font-bold text-sm text-primary bg-primary/20">${member.name.slice(0, 2).toUpperCase()}</div>`;
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-white truncate group-hover:text-primary transition-colors">
                          {member.name}
                        </h4>
                        <div className="text-[11px] font-medium text-primary/90 leading-tight mt-0.5 line-clamp-2">
                          {member.role}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                      {member.bio}
                    </p>

                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <div className="flex flex-wrap gap-1">
                        {member.focus.map((f, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded font-mono text-[9px] bg-surface text-muted-foreground border border-border/60">
                            {f}
                          </span>
                        ))}
                      </div>

                      <a
                        href={`mailto:${member.email}`}
                        className="inline-flex items-center gap-1.5 font-mono text-[11px] text-primary/80 hover:text-primary transition-colors pt-1"
                      >
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{member.email}</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Business Model & Vision */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PITCH_DECK_CONTENT.businessModel.streams.map((stream, idx) => (
                <div key={idx} className="rounded-xl border border-border/80 bg-surface-2 p-5 space-y-2">
                  <div className="font-mono text-xs text-primary font-semibold uppercase">{stream.name}</div>
                  <div className="text-xl font-bold text-white font-mono">{stream.pricing}</div>
                  <p className="text-xs text-muted-foreground">{stream.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TECHNICAL WHITEPAPER & ARCHITECTURE                                */}
        {/* ========================================================================= */}
        {activeTab === "tech" && (
          <div className="space-y-12 animate-in fade-in duration-300">
            {/* Tech Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/40 bg-primary/10 font-mono text-xs font-semibold text-primary">
                <Code className="h-3.5 w-3.5" /> SYSTEM SPECIFICATION & ARCHITECTURE
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
                Engineering Whitepaper: Distributed Edge-to-Cloud Pipeline
              </h2>
              <p className="text-sm text-muted-foreground max-w-3xl">
                Technical design documentation detailing the camera frame acquisition loop, edge optical contrast matrix, Gemini 3 multimodal failover, and cryptographic certificate hashing.
              </p>
            </div>

            {/* Interactive Architecture Flow Diagram */}
            <div className="rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold text-white">
                  <Layers className="h-4 w-4 text-primary" /> End-to-End System Architecture (SVG Vector Data Flow)
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">REACTIVE & OFFLINE-READY</span>
              </div>

              {/* Responsive SVG Architecture Pipeline */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {TECH_DOCS_CONTENT.architecture.layers.map((layer, idx) => (
                  <div key={idx} className="relative rounded-xl border border-border/70 bg-surface-2 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-primary">LAYER 0{idx + 1}</span>
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <h4 className="font-bold text-sm text-white">{layer.name}</h4>
                    <div className="font-mono text-[11px] text-cyan-300/90 leading-snug">{layer.tech}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/40">
                      {layer.role}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Step-by-Step Data Flow Pipeline */}
            <div className="rounded-2xl border border-border/80 bg-surface-2 p-6 sm:p-8 space-y-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> 6-Stage Real-Time Frame Processing Pipeline
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {TECH_DOCS_CONTENT.dataFlow.map((step) => (
                  <div key={step.step} className="rounded-xl border border-border/60 bg-surface p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/20 font-mono text-xs font-bold text-primary border border-primary/40">
                        {step.step}
                      </span>
                      <span className="font-bold text-xs text-white truncate">{step.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* API Endpoints Reference */}
            <div className="rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" /> API & Server Function Endpoints
              </h3>
              <div className="divide-y divide-border/50 font-mono text-xs">
                {TECH_DOCS_CONTENT.apiEndpoints.map((ep, idx) => (
                  <div key={idx} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold",
                        ep.method === "POST" ? "bg-primary/20 text-primary border border-primary/40" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      )}>
                        {ep.method}
                      </span>
                      <code className="text-white font-semibold text-xs">{ep.path}</code>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground text-[11px]">
                      <span>{ep.desc}</span>
                      <span className="px-2 py-0.5 rounded bg-surface-2 border border-border shrink-0">{ep.auth}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security, RBAC & Role Matrix */}
            <div className="rounded-2xl border border-border/80 bg-surface-2 p-6 sm:p-8 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Security & Role-Based Access Control (RBAC) Matrix
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border/80 text-muted-foreground">
                      <th className="py-2.5 pr-4">Plant Role</th>
                      <th className="py-2.5 px-4 text-center">Live Inspect</th>
                      <th className="py-2.5 px-4 text-center">Triage Review</th>
                      <th className="py-2.5 px-4 text-center">Certify Roll</th>
                      <th className="py-2.5 px-4 text-center">Plant Admin</th>
                      <th className="py-2.5 pl-4">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {TECH_DOCS_CONTENT.securityRbac.map((r, i) => (
                      <tr key={i} className="hover:bg-surface/50">
                        <td className="py-2.5 pr-4 font-bold text-white">{r.role}</td>
                        <td className="py-2.5 px-4 text-center">{r.inspect ? <span className="text-emerald-400">✓</span> : <span className="text-muted-foreground/30">&mdash;</span>}</td>
                        <td className="py-2.5 px-4 text-center">{r.review ? <span className="text-emerald-400">✓</span> : <span className="text-muted-foreground/30">&mdash;</span>}</td>
                        <td className="py-2.5 px-4 text-center">{r.certify ? <span className="text-emerald-400">✓</span> : <span className="text-muted-foreground/30">&mdash;</span>}</td>
                        <td className="py-2.5 px-4 text-center">{r.admin ? <span className="text-amber-400">✓</span> : <span className="text-muted-foreground/30">&mdash;</span>}</td>
                        <td className="py-2.5 pl-4 text-muted-foreground font-sans text-xs">{r.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Product Roadmap */}
            <div className="rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Engineering Product Roadmap (2026–2027)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TECH_DOCS_CONTENT.roadmap.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-border/60 bg-surface-2 p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-primary">{item.quarter}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded font-mono text-[10px] font-semibold",
                        item.status === "Completed" ? "bg-emerald-500/20 text-emerald-300" : item.status === "In Progress" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {item.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-white">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LIVE SYSTEM OPS & REAL-TIME STATE                                  */}
        {/* ========================================================================= */}
        {activeTab === "ops" && (
          <div className="space-y-12 animate-in fade-in duration-300">
            {/* Ops Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 font-mono text-xs font-semibold text-emerald-400">
                <Activity className="h-3.5 w-3.5" /> REAL-TIME FACTORY TELEMETRY
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
                Live State Synchronized with Ashulia Mill Unit 03
              </h2>
              <p className="text-sm text-muted-foreground max-w-3xl">
                This documentation page is directly connected to Tensora's Zustand state store, displaying real-time roll data, defect feeds, and camera telemetry.
              </p>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border/80 bg-surface-2 p-5 space-y-1">
                <div className="text-xs font-mono text-muted-foreground uppercase">Inspected Rolls</div>
                <div className="text-3xl font-extrabold text-white font-mono">{rolls.length}</div>
                <div className="text-[11px] font-mono text-primary">Active: {activeRollId}</div>
              </div>

              <div className="rounded-xl border border-border/80 bg-surface-2 p-5 space-y-1">
                <div className="text-xs font-mono text-muted-foreground uppercase">Logged Defect Flaws</div>
                <div className="text-3xl font-extrabold text-white font-mono">{defects.length}</div>
                <div className="text-[11px] font-mono text-emerald-400">ASTM D5430 Scored</div>
              </div>

              <div className="rounded-xl border border-border/80 bg-surface-2 p-5 space-y-1">
                <div className="text-xs font-mono text-muted-foreground uppercase">AI Vision Engine</div>
                <div className="text-2xl font-bold text-white font-mono truncate">Gemini 3 Flash</div>
                <div className="text-[11px] font-mono text-cyan-300">Dual-Layer Edge Active</div>
              </div>

              <div className="rounded-xl border border-border/80 bg-surface-2 p-5 space-y-1">
                <div className="text-xs font-mono text-muted-foreground uppercase">Offline Outbox Status</div>
                <div className="text-3xl font-extrabold text-emerald-400 font-mono">Synced</div>
                <div className="text-[11px] font-mono text-muted-foreground">IndexedDB Persistence</div>
              </div>
            </div>

            {/* Recent Defect Stream */}
            <div className="rounded-2xl border border-border/80 bg-surface p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-400" /> Recent Defect Log Stream (Live Feed)
                </h3>
                <Link to="/triage" className="text-xs font-mono text-primary hover:underline flex items-center gap-1">
                  Open Triage Ledger <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="divide-y divide-border/50 max-h-72 overflow-y-auto font-mono text-xs">
                {defects.slice(0, 8).map((d) => (
                  <div key={d.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "h-2 w-2 rounded-full",
                        d.points >= 3 ? "bg-destructive" : "bg-amber-400"
                      )} />
                      <strong className="text-white">{d.cls}</strong>
                      <span className="text-muted-foreground text-[11px]">Roll: {d.rollId}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-primary font-semibold">{d.points} pt penalty</span>
                      <span className="text-muted-foreground text-[11px]">@ {d.meter.toFixed(1)} m</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 border border-border text-foreground uppercase">{d.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct App Launch Call-to-Action */}
            <div className="rounded-2xl border border-primary/40 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-emerald-950/60 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Experience Live Handheld Scanning</h3>
                <p className="text-xs text-muted-foreground max-w-xl">
                  Open the Optical Inspection Station on mobile or desktop to run live edge optical analysis on fabric samples in real time.
                </p>
              </div>
              <Link
                to="/capture"
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:brightness-110 transition-all inline-flex items-center gap-2 shadow-lg shrink-0"
              >
                <Camera className="h-4 w-4" /> Launch Inspection Station
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* 5. Minimal Branded Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 border-t border-border/40 mt-16 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-muted-foreground">
        <div>
          Tensora {accessConfig.publishedVersion} · © {new Date().getFullYear()} Araneid Industrial Systems
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <Link to="/" className="hover:text-white transition-colors">Command Center</Link>
          <Link to="/capture" className="hover:text-white transition-colors">Capture</Link>
          <Link to="/triage" className="hover:text-white transition-colors">Triage</Link>
          <Link to="/trace" className="hover:text-white transition-colors">Trace</Link>
          <button type="button" onClick={copyShareLink} className="hover:text-primary transition-colors cursor-pointer">
            Copy Link
          </button>
        </div>
      </footer>
    </div>
  );
}
