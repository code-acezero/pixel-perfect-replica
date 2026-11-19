import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, CheckCheck, Cpu, Database, Filter, Info, ShieldCheck, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, Stat, Tag } from "@/components/tensora/ui";
import { DefectLedger } from "@/components/tensora/defect-ledger";
import { useTensora } from "@/lib/tensora/store";
import { DEFECT_CLASSES, type DefectClass } from "@/lib/tensora/data";
import { tabSearch } from "@/lib/tensora/search";
import { useCan } from "@/lib/tensora/use-can";

export const Route = createFileRoute("/_authenticated/triage")({
  validateSearch: tabSearch,
  head: () => ({
    meta: [
      { title: "Tensora Triage — Araneid" },
      { name: "description", content: "Human-in-the-loop review of AI-detected fabric defects: confirm, reclassify or dismiss." },
      { property: "og:title", content: "Tensora Triage — Araneid" },
      { property: "og:description", content: "Human-in-the-loop fabric defect review." },
    ],
  }),
  component: TriagePage,
});

function TriagePage() {
  const { tab = "pending" } = Route.useSearch();
  const navigate = useNavigate({ from: "/triage" });
  const { defects, rolls, feedbackCount, setDefectStatus } = useTensora();
  const canReview = useCan("review");

  const [roll, setRoll] = useState("all");
  const [cls, setCls] = useState("all");
  const [confRange, setConfRange] = useState<string>("all");
  const [showTrainingInfo, setShowTrainingInfo] = useState(false);

  const counts = {
    pending: defects.filter((d) => d.status === "pending").length,
    confirmed: defects.filter((d) => d.status === "confirmed").length,
    reclassified: defects.filter((d) => d.status === "reclassified").length,
    dismissed: defects.filter((d) => d.status === "dismissed").length,
  };

  // Filtered defects
  const list = useMemo(() => {
    return defects.filter((d) => {
      const matchStatus = tab === "all" || d.status === tab;
      const matchRoll = roll === "all" || d.rollId === roll;
      const matchCls = cls === "all" || d.cls === cls;
      const matchConf =
        confRange === "all" ||
        (confRange === "high" && d.confidence >= 0.85) ||
        (confRange === "mid" && d.confidence >= 0.7 && d.confidence < 0.85) ||
        (confRange === "low" && d.confidence < 0.7);
      return matchStatus && matchRoll && matchCls && matchConf;
    });
  }, [defects, tab, roll, cls, confRange]);

  // Batch action candidates
  const pendingHighConf = useMemo(() => {
    return list.filter((d) => d.status === "pending" && d.confidence >= 0.85);
  }, [list]);

  const pendingLowConf = useMemo(() => {
    return list.filter((d) => d.status === "pending" && d.confidence < 0.65);
  }, [list]);

  // Verified samples per class
  const classBreakdown = useMemo(() => {
    const verified = defects.filter((d) => d.status === "confirmed" || d.status === "reclassified");
    const countsMap: Record<string, number> = {};
    DEFECT_CLASSES.forEach((c) => { countsMap[c] = 0; });
    verified.forEach((d) => {
      countsMap[d.cls] = (countsMap[d.cls] || 0) + 1;
    });
    return countsMap;
  }, [defects]);

  const totalVerified = counts.confirmed + counts.reclassified;
  const agreementRate = totalVerified > 0 ? Math.round((counts.confirmed / totalVerified) * 100) : 94;

  const handleConfirmBatch = (items: typeof list) => {
    items.forEach((d) => setDefectStatus(d.id, "confirmed"));
    toast.success(`Confirmed ${items.length} defect${items.length !== 1 ? "s" : ""} — crops synced to few-shot training pool`);
  };

  const handleDismissBatch = (items: typeof list) => {
    items.forEach((d) => setDefectStatus(d.id, "dismissed"));
    toast(`${items.length} defect${items.length !== 1 ? "s" : ""} dismissed — removed from scoring`);
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <PageHeader
        module="Tensora Triage"
        title="Defect Review Queue & Active Learning"
        description="Human-in-the-loop review. Confirming or reclassifying defects commits crops into the few-shot training pool for subsequent AI frame analysis."
        actions={
          <Button
            variant="outline"
            className="text-xs gap-1.5"
            onClick={() => setShowTrainingInfo(!showTrainingInfo)}
          >
            <Database className="h-3.5 w-3.5 text-telemetry" />
            {showTrainingInfo ? "Hide AI Training Stats" : "Show AI Training Loop"}
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pending review" value={counts.pending} tone="minor" />
        <Stat label="Confirmed (Training Samples)" value={counts.confirmed} tone="pass" />
        <Stat label="Reclassified" value={counts.reclassified} tone="telemetry" />
        <Stat
          label="Human-AI Agreement"
          value={`${agreementRate}%`}
          delta={`${feedbackCount.toLocaleString()} total labels sent to TX-Vision training`}
          tone="default"
        />
      </div>

      {/* Few-Shot Model Training Loop Transparency Card */}
      {showTrainingInfo && (
        <div className="liquid-card rounded-xl border border-border/70 bg-surface-2/90 backdrop-blur-md p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-telemetry" />
              <span className="text-sm font-semibold">Active Few-Shot Vision Pipeline Architecture</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Tag tone="pass">DB Trigger: defect_to_training() Active</Tag>
              <Tag tone="telemetry">Model: openai/gpt-6-astra</Tag>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            When a reviewer confirms or reclassifies an AI detection, PostgreSQL automatically copies the high-resolution crop into the <code className="text-foreground">defect-crops</code> storage bucket. On every live camera frame, <code className="text-foreground">analyzeFrame</code> queries up to 2 reference crops per class to anchor few-shot visual prompting.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
            {DEFECT_CLASSES.map((c) => (
              <div key={c} className="rounded border border-border bg-background/50 p-2 font-mono text-xs">
                <div className="text-[10px] text-muted-foreground truncate">{c}</div>
                <div className="font-bold text-foreground text-sm mt-0.5">{classBreakdown[c]} crops</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <Tabs value={tab} onValueChange={(t) => navigate({ search: { tab: t } })} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="overflow-x-auto">
            <TabsList>
              <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmed ({counts.confirmed})</TabsTrigger>
              <TabsTrigger value="reclassified">Reclassified ({counts.reclassified})</TabsTrigger>
              <TabsTrigger value="dismissed">Dismissed ({counts.dismissed})</TabsTrigger>
              <TabsTrigger value="all">All ({defects.length})</TabsTrigger>
            </TabsList>
          </div>

          {/* Batch Actions Bar for Pending Tab */}
          {tab === "pending" && counts.pending > 0 && canReview && (
            <div className="flex flex-wrap items-center gap-2">
              {pendingHighConf.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-pass/40 text-pass hover:bg-pass/10 text-xs gap-1.5"
                  onClick={() => handleConfirmBatch(pendingHighConf)}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Confirm High-Confidence ({pendingHighConf.length} ≥ 85%)
                </Button>
              )}
              {pendingLowConf.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-destructive/40 text-muted-foreground hover:text-destructive text-xs gap-1.5"
                  onClick={() => handleDismissBatch(pendingLowConf)}
                >
                  <X className="h-3.5 w-3.5" />
                  Dismiss Low-Confidence ({pendingLowConf.length} &lt; 65%)
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Filter Controls Bar */}
        <Panel
          title={
            <div className="flex items-center gap-2">
              <span>{list.length} Defects in View</span>
              {roll !== "all" && <span className="font-mono text-primary text-xs">· Roll {roll}</span>}
              {cls !== "all" && <span className="text-xs">· {cls}</span>}
            </div>
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Select value={roll} onValueChange={setRoll}>
                <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All rolls</SelectItem>
                  {rolls.map((r) => <SelectItem key={r.id} value={r.id}>{r.id}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={cls} onValueChange={setCls}>
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {DEFECT_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={confRange} onValueChange={setConfRange}>
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All confidence</SelectItem>
                  <SelectItem value="high">≥ 85% High</SelectItem>
                  <SelectItem value="mid">70% – 84% Mid</SelectItem>
                  <SelectItem value="low">&lt; 70% Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        >
          <DefectLedger defects={list} showRoll empty="Queue clear — nothing waiting for review in this filter." />
        </Panel>
      </Tabs>
    </div>
  );
}
