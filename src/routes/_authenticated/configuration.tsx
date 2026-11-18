import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Plus, Sliders, MapPin, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, Panel, SeverityBadge, Tag, fmtDateTime } from "@/components/tensora/ui";
import { TrainingLibrary } from "@/components/tensora/training-library";
import { IntegrationsPanel } from "@/components/tensora/integrations-panel";
import { UsersRoles } from "@/components/tensora/users-roles";
import { tabSearch } from "@/lib/tensora/search";
import { useTensora } from "@/lib/tensora/store";
import type { DefectClass } from "@/lib/tensora/data";

export const Route = createFileRoute("/_authenticated/configuration")({
  validateSearch: tabSearch,
  head: () => ({
    meta: [
      { title: "System Configuration — Tensora by Araneid" },
      { name: "description", content: "Inspection recipes, defect taxonomy, sites, integrations, users and audit log." },
      { property: "og:title", content: "System Configuration — Tensora" },
      { property: "og:description", content: "Configure Tensora for your mills." },
    ],
  }),
  component: ConfigPage,
});

function ConfigPage() {
  const { tab = "recipes" } = Route.useSearch();
  const navigate = useNavigate({ from: "/configuration" });

  const {
    recipes,
    updateRecipe,
    taxonomy,
    updateTaxonomy,
    sites,
    updateSite,
    auditLogs,
    addAuditEntry,
  } = useTensora();

  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [newSiteId, setNewSiteId] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteLines, setNewSiteLines] = useState("");

  const handleAddSite = () => {
    if (!newSiteId.trim() || !newSiteName.trim()) {
      toast.error("Site ID and name are required");
      return;
    }
    useTensora.setState((s) => ({
      sites: [...s.sites, { id: newSiteId.trim().toUpperCase(), name: newSiteName.trim(), lines: newSiteLines.trim() || "Line #01" }],
    }));
    addAuditEntry(`New site ${newSiteId.toUpperCase()} registered: ${newSiteName}`);
    toast.success(`Site ${newSiteId} registered`);
    setSiteModalOpen(false);
    setNewSiteId("");
    setNewSiteName("");
    setNewSiteLines("");
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader module="System Configuration" title="Platform Settings" />
      <Tabs value={tab} onValueChange={(t) => navigate({ search: { tab: t } })}>
        <div className="mb-4 overflow-x-auto">
          <TabsList>
            <TabsTrigger value="recipes">Inspection Recipes ({recipes.length})</TabsTrigger>
            <TabsTrigger value="taxonomy">Defect Taxonomy ({taxonomy.length})</TabsTrigger>
            <TabsTrigger value="training">AI Training</TabsTrigger>
            <TabsTrigger value="sites">Sites & Locations ({sites.length})</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
            <TabsTrigger value="audit">Audit Log ({auditLogs.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="recipes" className="grid gap-3 md:grid-cols-2">
          {recipes.map((r) => (
            <Panel key={r.id} title={r.name}>
              <div className="flex justify-between text-sm">
                <span>Detection sensitivity</span>
                <span className="font-mono font-semibold text-primary">{r.sensitivity}%</span>
              </div>
              <Slider
                value={[r.sensitivity]}
                max={100}
                min={20}
                step={1}
                className="mt-3"
                onValueChange={([val]) => {
                  if (typeof val === "number") {
                    updateRecipe(r.id, { sensitivity: val });
                  }
                }}
              />
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Min confidence: {(r.minConfidence * 100).toFixed(0)}%</span>
                <span className="font-mono text-[10px]">ID: {r.id}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Higher sensitivity catches finer anomalies but may increase edge false alarms.
              </p>
            </Panel>
          ))}
        </TabsContent>

        <TabsContent value="taxonomy">
          <Panel bodyClassName="p-0">
            {taxonomy.map((item) => (
              <div key={item.cls} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <span className={`flex-1 font-medium ${item.enabled ? "" : "text-muted-foreground line-through"}`}>
                  {item.cls}
                </span>
                <span className="text-xs text-muted-foreground">ASTM D5430</span>
                <SeverityBadge points={item.points} />
                <Switch
                  checked={item.enabled}
                  onCheckedChange={(checked) => {
                    updateTaxonomy(item.cls, { enabled: checked });
                    toast(checked ? `Enabled defect class ${item.cls}` : `Disabled defect class ${item.cls}`);
                  }}
                  aria-label={`Enable ${item.cls}`}
                />
              </div>
            ))}
          </Panel>
        </TabsContent>

        <TabsContent value="training">
          <TrainingLibrary />
        </TabsContent>

        <TabsContent value="sites" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setSiteModalOpen(true)}>
              <Plus className="h-4 w-4" /> Add Mill Site
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {sites.map((st) => (
              <Panel key={st.id} title={st.id}>
                <div className="font-medium text-base">{st.name}</div>
                <p className="mt-1 text-sm text-muted-foreground">{st.lines}</p>
              </Panel>
            ))}
          </div>

          <Dialog open={siteModalOpen} onOpenChange={setSiteModalOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Add New Mill Site</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="label-caps block mb-1">Site Code (e.g. CTG-U02)</label>
                  <Input value={newSiteId} onChange={(e) => setNewSiteId(e.target.value)} className="h-8 font-mono text-xs" />
                </div>
                <div>
                  <label className="label-caps block mb-1">Mill Name</label>
                  <Input value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} className="h-8 text-xs" placeholder="e.g. Chittagong Mill — Unit 02" />
                </div>
                <div>
                  <label className="label-caps block mb-1">Inspection Lines</label>
                  <Input value={newSiteLines} onChange={(e) => setNewSiteLines(e.target.value)} className="h-8 text-xs" placeholder="e.g. Line #01, #02 · Finishing Hall" />
                </div>
              </div>
              <DialogFooter className="mt-3">
                <Button size="sm" variant="ghost" onClick={() => setSiteModalOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAddSite}>Save Site</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsPanel />
        </TabsContent>

        <TabsContent value="users">
          <UsersRoles />
        </TabsContent>

        <TabsContent value="audit">
          <Panel bodyClassName="p-0">
            {auditLogs.map((entry) => (
              <div key={entry.id} className="flex gap-3 border-b border-border px-4 py-2.5 font-mono text-xs last:border-0">
                <span className="text-muted-foreground shrink-0">{fmtDateTime(entry.ts)}</span>
                <span className="font-semibold text-primary shrink-0">[{entry.actor}]</span>
                <span className="min-w-0 flex-1">{entry.action}</span>
              </div>
            ))}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
