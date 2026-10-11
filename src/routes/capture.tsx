import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel } from "@/components/tensora/ui";
import { InspectionStation } from "@/components/tensora/inspection-station";
import { AuditMeter } from "@/components/tensora/audit-meter";
import { DefectLedger } from "@/components/tensora/defect-ledger";
import { useTensora } from "@/lib/tensora/store";
import { tabSearch } from "@/lib/tensora/search";

export const Route = createFileRoute("/capture")({
  validateSearch: tabSearch,
  head: () => ({
    meta: [
      { title: "Tensora Capture — Araneid" },
      { name: "description", content: "Turn any phone, tablet or camera into a live AI fabric inspection station with ASTM D5430 scoring." },
      { property: "og:title", content: "Tensora Capture — Araneid" },
      { property: "og:description", content: "Live AI fabric inspection from any camera." },
    ],
  }),
  component: CapturePage,
});

function CapturePage() {
  const { tab = "live" } = Route.useSearch();
  const navigate = useNavigate({ from: "/capture" });
  const { activeRollId, activeSessionId } = useTensora();
  const allDefects = useTensora((s) => s.defects);
  const defects = allDefects.filter((d) => d.rollId === activeRollId);
  const cluster = useTensora((s) => s.alerts.find((a) => a.id === "ALR-0091"));

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        module="Tensora Capture"
        title="Optical Inspection Station"
        description={`Session ${activeSessionId} · Roll ${activeRollId}`}
        actions={
          <Button asChild variant="outline">
            <Link to="/certify">Issue certificate</Link>
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(t) => navigate({ search: { tab: t } })}>
        <TabsList className="mb-4">
          <TabsTrigger value="live">Live Inspection</TabsTrigger>
          <TabsTrigger value="setup">Session Setup</TabsTrigger>
          <TabsTrigger value="quality">Capture Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Panel title="Tensora Optical Inspection Station" bodyClassName="p-3">
              <InspectionStation />
            </Panel>
            <AuditMeter rollId={activeRollId} />
          </div>
          {cluster && (
            <div className="panel flex flex-col gap-3 border-major/40 bg-major/5 p-4 sm:flex-row sm:items-center">
              <AlertTriangle className="h-6 w-6 shrink-0 text-major" />
              <div className="min-w-0 flex-1">
                <div className="label-caps text-major">Araneid Factory Intelligence</div>
                <p className="mt-1 text-sm">
                  <b>{cluster.title}:</b> {cluster.body} Estimated scrap saved: <b className="text-pass">${cluster.savings}</b>.
                </p>
              </div>
              <Button asChild size="sm" variant="outline"><Link to="/insight">Open Insight</Link></Button>
            </div>
          )}
          <Panel title={`Defect ledger & HITL triage · ${defects.length}`} action={<Link to="/triage" className="text-xs text-primary">Open Triage</Link>}>
            <DefectLedger defects={defects.slice(0, 12)} />
          </Panel>
        </TabsContent>

        <TabsContent value="setup"><SessionSetup /></TabsContent>
        <TabsContent value="quality"><CaptureQuality /></TabsContent>
      </Tabs>
    </div>
  );
}

function SessionSetup() {
  const { rolls, buyers, devices, activeRollId, setActiveRoll, setStreamMode } = useTensora();
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [roll, setRoll] = useState(activeRollId);
  const [cam, setCam] = useState("rear");
  const r = rolls.find((x) => x.id === roll)!;
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((d) => setCams(d.filter((x) => x.kind === "videoinput"))).catch(() => {});
  }, []);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="1 · Camera">
        <Select value={cam} onValueChange={setCam}>
          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="rear">This device · Rear camera</SelectItem>
            <SelectItem value="front">This device · Front camera</SelectItem>
            {cams.map((c, i) => <SelectItem key={c.deviceId || i} value={c.deviceId || `cam-${i}`}>{c.label || `Camera ${i + 1}`}</SelectItem>)}
            {devices.map((d) => <SelectItem key={d.id} value={d.id}>{d.id} · {d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="mt-2 text-xs text-muted-foreground">Phones, tablets, webcams, USB and IP cameras are all supported. Pair more in Devices.</p>
      </Panel>
      <Panel title="2 · Roll / lot">
        <div className="flex gap-2">
          <Select value={roll} onValueChange={setRoll}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{rolls.map((x) => <SelectItem key={x.id} value={x.id}>{x.id} · {x.article}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" className="h-11 gap-2" onClick={() => toast("Point the camera at the roll ticket barcode")}><ScanLine className="h-4 w-4" /> Scan</Button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs">
          <div className="rounded border border-border bg-surface-2 p-2"><div className="label-caps">GSM</div>{r.gsm}</div>
          <div className="rounded border border-border bg-surface-2 p-2"><div className="label-caps">Width</div>{r.widthIn} in</div>
          <div className="rounded border border-border bg-surface-2 p-2"><div className="label-caps">Lot</div>{r.lot}</div>
        </div>
      </Panel>
      <Panel title="3 · Buyer standard">
        <div className="rounded border border-border bg-surface-2 p-3 text-sm">
          {buyers.find((b) => b.id === r.buyerId)?.name} — limit {buyers.find((b) => b.id === r.buyerId)?.limit}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Change standards in Grade.</p>
      </Panel>
      <Panel title="4 · Location">
        <Input defaultValue="Line #04 · Take-down" className="h-11" />
        <Button
          className="mt-4 h-11 w-full"
          onClick={() => {
            setActiveRoll(roll);
            if (cam !== "rear" || cams.length) setStreamMode("live");
            toast.success(`Session ready for roll ${roll}`);
          }}
        >
          Start inspection session
        </Button>
      </Panel>
    </div>
  );
}

function CaptureQuality() {
  const metrics = [
    { k: "Lighting uniformity", v: 92, tip: "Even, diffuse light. Good." },
    { k: "Focus sharpness", v: 88, tip: "Hold 30–45 cm from fabric surface." },
    { k: "Motion blur", v: 81, tip: "Reduce scan speed below 45 m/min or brace the device." },
    { k: "Coverage (width)", v: 64, tip: "Move back — only 64% of fabric width in frame." },
    { k: "Colour fidelity", v: 95, tip: "White balance locked to D65 calibration card." },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Live capture diagnostics">
        <div className="space-y-4">
          {metrics.map((m) => (
            <div key={m.k}>
              <div className="flex justify-between text-sm"><span>{m.k}</span><span className={`font-mono ${m.v >= 80 ? "text-pass" : "text-minor"}`}>{m.v}%</span></div>
              <Progress value={m.v} className="mt-1.5 h-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">{m.tip}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Operator guidance">
        <ul className="space-y-3 text-sm">
          {[
            [true, "Camera calibrated with Araneid reference card"],
            [true, "Model TX-Vision-9 loaded on device (edge inference)"],
            [false, "Move back ~15 cm to capture full width"],
            [true, "Stable network — results syncing"],
          ].map(([ok, t]) => (
            <li key={String(t)} className="flex items-start gap-2">
              {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pass" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-minor" />}
              {t}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
