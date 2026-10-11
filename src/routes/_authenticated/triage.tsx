import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, Stat } from "@/components/tensora/ui";
import { DefectLedger } from "@/components/tensora/defect-ledger";
import { useTensora } from "@/lib/tensora/store";
import { DEFECT_CLASSES } from "@/lib/tensora/data";
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
  const counts = {
    pending: defects.filter((d) => d.status === "pending").length,
    confirmed: defects.filter((d) => d.status === "confirmed").length,
    reclassified: defects.filter((d) => d.status === "reclassified").length,
    dismissed: defects.filter((d) => d.status === "dismissed").length,
  };
  const list = defects.filter(
    (d) => (tab === "all" || d.status === tab) && (roll === "all" || d.rollId === roll) && (cls === "all" || d.cls === cls),
  );
  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        module="Tensora Triage"
        title="Defect Review Queue"
        description="Every reviewer decision trains the model. Dismissed defects are removed from roll scores."
        actions={
          tab === "pending" && list.length > 0 ? (
            <Button variant="outline" className="border-pass/40 text-pass" disabled={!canReview} onClick={() => { list.filter((d) => d.confidence >= 0.9).forEach((d) => setDefectStatus(d.id, "confirmed")); toast.success("Confirmed all ≥ 90% confidence"); }}>
              Confirm all ≥ 90%
            </Button>
          ) : null
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pending review" value={counts.pending} tone="minor" />
        <Stat label="Confirmed" value={counts.confirmed} tone="pass" />
        <Stat label="Reclassified" value={counts.reclassified} tone="telemetry" />
        <Stat label="Model feedback" value={feedbackCount.toLocaleString()} delta="Labels sent to TX-Vision training" />
      </div>
      <Tabs value={tab} onValueChange={(t) => navigate({ search: { tab: t } })} className="mb-3">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="reclassified">Reclassified</TabsTrigger>
            <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
      <Panel
        title={`${list.length} defects`}
        action={
          <div className="flex gap-2">
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
          </div>
        }
      >
        <DefectLedger defects={list} showRoll empty="Queue clear — nothing waiting for review." />
      </Panel>
    </div>
  );
}
