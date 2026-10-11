import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Panel, SeverityBadge, Tag } from "@/components/tensora/ui";
import { DEFECT_CLASSES, DEFAULT_POINTS, INSPECTORS } from "@/lib/tensora/data";
import { ROLES } from "@/lib/tensora/store";
import { tabSearch } from "@/lib/tensora/search";

export const Route = createFileRoute("/configuration")({
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

const RECIPES = [
  ["Single Jersey 180 GSM", 72],
  ["CVC Pique 220 GSM", 65],
  ["Cotton Spandex Rib", 80],
  ["Polyester Interlock", 58],
  ["Organic Fleece 300 GSM", 70],
] as const;

function ConfigPage() {
  const { tab = "recipes" } = Route.useSearch();
  const navigate = useNavigate({ from: "/configuration" });
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader module="System Configuration" title="Platform Settings" />
      <Tabs value={tab} onValueChange={(t) => navigate({ search: { tab: t } })}>
        <div className="mb-4 overflow-x-auto">
          <TabsList>
            <TabsTrigger value="recipes">Inspection Recipes</TabsTrigger>
            <TabsTrigger value="taxonomy">Defect Taxonomy</TabsTrigger>
            <TabsTrigger value="sites">Sites & Locations</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="recipes" className="grid gap-3 md:grid-cols-2">
          {RECIPES.map(([name, sens]) => (
            <Panel key={name} title={name}>
              <div className="flex justify-between text-sm"><span>Detection sensitivity</span><span className="font-mono">{sens}%</span></div>
              <Slider defaultValue={[sens]} max={100} className="mt-3" />
              <p className="mt-2 text-xs text-muted-foreground">Higher sensitivity catches finer defects but may increase false positives.</p>
            </Panel>
          ))}
        </TabsContent>
        <TabsContent value="taxonomy">
          <Panel bodyClassName="p-0">
            {DEFECT_CLASSES.map((c) => (
              <div key={c} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <span className="flex-1">{c}</span>
                <span className="text-xs text-muted-foreground">default</span>
                <SeverityBadge points={DEFAULT_POINTS[c]} />
                <Switch defaultChecked aria-label={`Enable ${c}`} />
              </div>
            ))}
          </Panel>
        </TabsContent>
        <TabsContent value="sites" className="grid gap-3 md:grid-cols-2">
          {[["ASH-U03", "Ashulia Mill — Unit 03", "Line #02, #04, #05 · QC Hall · Finishing · Warehouse"], ["GZP-U01", "Gazipur Mill — Unit 01", "Line #03, #07 · QC Hall"], ["DHK-BO", "Buyer Office — Dhaka", "Audit room"]].map(([id, n, l]) => (
            <Panel key={id} title={id}><div className="font-medium">{n}</div><p className="mt-1 text-sm text-muted-foreground">{l}</p></Panel>
          ))}
        </TabsContent>
        <TabsContent value="integrations" className="grid gap-3 md:grid-cols-3">
          {["ERP (SAP / Oracle)", "MES / Production", "Webhooks", "Buyer portals", "Email reports", "Single sign-on"].map((n) => (
            <Panel key={n} title={n}><Tag>Coming soon</Tag></Panel>
          ))}
        </TabsContent>
        <TabsContent value="users">
          <Panel bodyClassName="p-0">
            {INSPECTORS.map((u, i) => (
              <div key={u} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary font-mono text-xs">{u.split(" ").pop()?.[0]}</span>
                <span className="flex-1">{u}</span>
                <Tag tone="telemetry">{ROLES[i % ROLES.length]}</Tag>
              </div>
            ))}
          </Panel>
        </TabsContent>
        <TabsContent value="audit">
          <Panel bodyClassName="p-0">
            {["Buyer standard BYR-ZR-02 limit changed 22 → 20", "Device CAM-PH-11 paired at Greige Warehouse", "Recipe 'Cotton Spandex Rib' sensitivity 75 → 80", "Certificate QAC-2026-0031 issued", "User T. Islam role set to Field Inspector"].map((e, i) => (
              <div key={e} className="flex gap-3 border-b border-border px-4 py-2.5 font-mono text-xs last:border-0">
                <span className="text-muted-foreground">2026-10-1{1 - (i > 2 ? 1 : 0)} 0{8 - i}:1{i}</span>
                <span>{e}</span>
              </div>
            ))}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
