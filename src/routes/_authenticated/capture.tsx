import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Plus, QrCode, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, Panel } from "@/components/tensora/ui";
import { InspectionStation } from "@/components/tensora/inspection-station";
import { AuditMeter } from "@/components/tensora/audit-meter";
import { DefectLedger } from "@/components/tensora/defect-ledger";
import { RollTicketModal } from "@/components/tensora/roll-ticket";
import { CompanionBroadcaster } from "@/components/tensora/companion-broadcaster";
import { useTensora } from "@/lib/tensora/store";
import { tabSearch } from "@/lib/tensora/search";
import { useCan } from "@/lib/tensora/use-can";
import {
  BD_FABRIC_TYPES,
  BD_SHIFTS,
  BD_YARN_COUNTS,
  type Roll,
  rollsSeed,
  buyersSeed,
} from "@/lib/tensora/data";

export const Route = createFileRoute("/_authenticated/capture")({
  ssr: false,
  validateSearch: tabSearch,
  head: () => ({
    meta: [
      { title: "Tensora Capture — Araneid" },
      { name: "description", content: "Turn any phone, tablet or camera into a live AI fabric inspection station with ASTM D5430 scoring." },
      { property: "og:title", content: "Tensora Capture — Araneid" },
      { property: "og:description", content: "Live AI fabric inspection from any camera." },
    ],
  }),
  errorComponent: CaptureErrorFallback,
  component: CapturePage,
});

function CaptureErrorFallback({ error, reset }: { error: unknown; reset: () => void }) {
  return (
    <div className="flex min-h-[500px] items-center justify-center p-4">
      <div className="max-w-md rounded-2xl border border-border/80 bg-surface-2 p-6 text-center shadow-2xl">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-destructive/15 text-destructive border border-destructive/30 mb-3">
          <ScanLine className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">Optical Station Reload Needed</h2>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "The camera viewfinder encountered a hardware or display sync issue."}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button size="sm" onClick={() => reset()}>
            Reset Station
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/">Command Center</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function CapturePage() {
  const { tab = "live", pair, roll: queryRoll, mode } = Route.useSearch();
  const navigate = useNavigate();
  const {
    activeRollId,
    activeSessionId,
    pairDevice,
    setSelectedDeviceId,
    setStreamMode,
    sessionLocation,
    setActiveRoll,
    rolls,
    buyers,
    defects: allDefects,
  } = useTensora();
  const canInspect = useCan("inspect");
  const defects = allDefects.filter((d) => d.rollId === activeRollId);
  const cluster = useTensora((s) => s.alerts?.find((a) => a.id === "ALR-0091"));
  const currentRoll = rolls.find((r) => r.id === activeRollId) ?? rolls[0] ?? rollsSeed[0];
  const currentBuyer = (currentRoll && buyers.find((b) => b.id === currentRoll.buyerId)) ?? buyers[0] ?? buyersSeed[0];

  // If in companion broadcaster mode (e.g. phone scanned QR code or user clicked "Launch Broadcaster")
  if (pair && mode === "broadcaster") {
    return (
      <CompanionBroadcaster
        pairId={pair}
        onExit={() => navigate({ to: "/capture", search: { tab: "live" } })}
      />
    );
  }

  // Handle ?pair= query parameter from QR code scan
  useEffect(() => {
    if (pair && mode !== "broadcaster") {
      pairDevice(pair, {
        name: `Companion Rover ${pair}`,
        kind: "Phone",
        location: sessionLocation,
        status: "online",
        lastSession: activeSessionId,
      });
      setSelectedDeviceId(pair);
      setStreamMode("live");
      toast.success(`Companion camera ${pair} connected live!`);
    }
  }, [pair, mode, pairDevice, sessionLocation, activeSessionId, setSelectedDeviceId, setStreamMode]);

  // Handle ?roll= query parameter
  useEffect(() => {
    if (queryRoll) {
      setActiveRoll(queryRoll);
    }
  }, [queryRoll, setActiveRoll]);

  return (
    <div className="mx-auto max-w-[1600px] w-full overflow-x-hidden">
      <PageHeader
        module="Tensora Capture"
        title="Optical Inspection Station"
        description={`Session ${activeSessionId} · Roll ${activeRollId}`}
        actions={
          <div className="flex items-center gap-2">
            {currentRoll && (
              <RollTicketModal roll={currentRoll} buyer={currentBuyer} />
            )}
            <Button asChild variant="outline">
              <Link to="/certify">Issue certificate</Link>
            </Button>
          </div>
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
            <div className="min-w-0">
              {canInspect ? (
                <InspectionStation />
              ) : (
                <div className="grid aspect-video place-items-center rounded-2xl border border-border bg-surface-2 p-6 text-center text-sm text-muted-foreground">
                  Buyer Auditor accounts are read-only. Live inspection is available to plant inspectors.
                </div>
              )}
            </div>
            <div className="min-w-0">
              <AuditMeter rollId={activeRollId} />
            </div>
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

        <TabsContent value="setup"><SessionSetup onStartLive={() => navigate({ search: { tab: "live" } })} /></TabsContent>
        <TabsContent value="quality"><CaptureQuality /></TabsContent>
      </Tabs>
    </div>
  );
}

function SessionSetup({ onStartLive }: { onStartLive: () => void }) {
  const {
    rolls,
    buyers,
    devices,
    activeRollId,
    setActiveRoll,
    setStreamMode,
    selectedDeviceId,
    setSelectedDeviceId,
    sessionLocation,
    setSessionLocation,
    addRoll,
  } = useTensora();
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanTab, setScanTab] = useState<"scan" | "create">("scan");
  const [barcodeInput, setBarcodeInput] = useState("");

  // New roll form state (Bangladeshi RMG Mill Standard fields)
  const [newRollId, setNewRollId] = useState(`TX-${Math.floor(8830 + Math.random() * 500)}`);
  const [newArticle, setNewArticle] = useState("100% Combed Cotton Single Jersey 180 GSM");
  const [newGsm, setNewGsm] = useState(180);
  const [newWidth, setNewWidth] = useState(60);
  const [newCuttableWidth, setNewCuttableWidth] = useState(59);
  const [newLength, setNewLength] = useState(150);
  const [newLot, setNewLot] = useState(`LOT-2026-${Math.floor(1150 + Math.random() * 50)}`);
  const [newYarnLot, setNewYarnLot] = useState(`YL-30S-${Math.floor(7800 + Math.random() * 200)}`);
  const [newBuyerId, setNewBuyerId] = useState(buyers[0]?.id ?? "BYR-HM-01");
  const [newSupplier, setNewSupplier] = useState("Square Yarns Ltd");
  const [newShift, setNewShift] = useState<string>(BD_SHIFTS[0]);
  const [newMachineNo, setNewMachineNo] = useState("Mayer & Cie #14");
  const [newDyeBatch, setNewDyeBatch] = useState("DYE-2026-8802");
  const [newYarnCount, setNewYarnCount] = useState<string>(BD_YARN_COUNTS[2]);
  const [newFabricType, setNewFabricType] = useState<string>(BD_FABRIC_TYPES[0]);
  const [newSkewPct, setNewSkewPct] = useState(1.2);
  const [newGsmLeft, setNewGsmLeft] = useState(180);
  const [newGsmCenter, setNewGsmCenter] = useState(182);
  const [newGsmRight, setNewGsmRight] = useState(180);

  const fallbackRoll: Roll = {
    id: "TX-1001",
    article: "100% Combed Cotton Single Jersey",
    gsm: 180,
    widthIn: 60,
    cuttableWidthIn: 59,
    lengthM: 100,
    buyerId: buyers[0]?.id ?? "BYR-HM-01",
    lot: "LOT-2026-0001",
    yarnLot: "YL-30S-0001",
    supplier: "Square Yarns Ltd",
    site: "ASH-U03",
    line: "ASH-U03-L04",
    status: "inspecting",
    gsmMeasured: 181,
    gsmLeft: 180,
    gsmCenter: 182,
    gsmRight: 180,
    widthMeasured: 60,
    bowPct: 0.8,
    skewPct: 1.2,
    shift: "Shift A (06:00 - 14:00)",
    machineNo: "Mayer & Cie #14",
    dyeBatch: "DYE-2026-8802",
    yarnCount: "30/1 Ne Combed Compact",
    fabricType: "Single Jersey",
    shadeDE: 0.35,
    shrinkPct: 3.0,
  };

  const r = rolls.find((x) => x.id === activeRollId) ?? rolls[0] ?? fallbackRoll;

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((d) => setCams(d.filter((x) => x.kind === "videoinput"))).catch(() => {});
  }, []);

  const handleSimulateScan = (ticketCode?: string) => {
    const code = ticketCode || barcodeInput.trim();
    if (!code) {
      toast.error("Please enter or scan a barcode ticket number");
      return;
    }
    const matched = rolls.find((x) => x.id.toLowerCase() === code.toLowerCase() || x.lot.toLowerCase() === code.toLowerCase());
    if (matched) {
      setActiveRoll(matched.id);
      toast.success(`Roll ticket matched: ${matched.id} (${matched.article})`);
      setScanModalOpen(false);
    } else {
      // Auto-create from scanned ticket with full BD specs
      const autoId = code.toUpperCase().startsWith("TX-") ? code.toUpperCase() : `TX-${code.toUpperCase()}`;
      const created: Roll = {
        id: autoId,
        article: "Scanned Lot Fabric",
        gsm: 180,
        gsmLeft: 179,
        gsmCenter: 181,
        gsmRight: 180,
        widthIn: 60,
        cuttableWidthIn: 59,
        lengthM: 120,
        buyerId: buyers[0]?.id ?? "BYR-HM-01",
        lot: code,
        yarnLot: `YL-${code}`,
        supplier: "Square Yarns Ltd",
        site: "ASH-U03",
        line: sessionLocation || "ASH-U03-L04",
        status: "inspecting",
        gsmMeasured: 180,
        widthMeasured: 60,
        bowPct: 1.0,
        skewPct: 1.2,
        shift: "Shift A (06:00 - 14:00)",
        machineNo: "Mayer & Cie #14",
        dyeBatch: "DYE-2026-8802",
        yarnCount: "30/1 Ne Combed Compact",
        fabricType: "Single Jersey",
        shadeDE: 0.35,
        shrinkPct: 3.0,
      };
      addRoll(created);
      setActiveRoll(created.id);
      toast.success(`Scanned new roll ticket: ${created.id}`);
      setScanModalOpen(false);
    }
  };

  const handleCreateRoll = () => {
    if (!newRollId.trim()) {
      toast.error("Roll ID is required");
      return;
    }
    const gsmL = Number(newGsmLeft) || Number(newGsm) || 180;
    const gsmC = Number(newGsmCenter) || Number(newGsm) || 180;
    const gsmR = Number(newGsmRight) || Number(newGsm) || 180;
    const avgGsm = Math.round((gsmL + gsmC + gsmR) / 3);

    const roll: Roll = {
      id: newRollId.trim().toUpperCase(),
      article: newArticle.trim() || "100% Combed Cotton Single Jersey",
      gsm: Number(newGsm) || 180,
      widthIn: Number(newWidth) || 60,
      cuttableWidthIn: Number(newCuttableWidth) || (Number(newWidth) - 1.0) || 59,
      lengthM: Number(newLength) || 100,
      buyerId: newBuyerId,
      lot: newLot || "LOT-CUSTOM",
      yarnLot: newYarnLot || "YL-CUSTOM",
      supplier: newSupplier || "Square Yarns Ltd",
      site: "ASH-U03",
      line: sessionLocation || "ASH-U03-L04",
      status: "inspecting",
      gsmMeasured: avgGsm,
      gsmLeft: gsmL,
      gsmCenter: gsmC,
      gsmRight: gsmR,
      widthMeasured: Number(newWidth) || 60,
      bowPct: 0.9,
      skewPct: Number(newSkewPct) || 1.2,
      shift: newShift,
      machineNo: newMachineNo,
      dyeBatch: newDyeBatch,
      yarnCount: newYarnCount,
      fabricType: newFabricType,
      shadeDE: 0.38,
      shrinkPct: 3.0,
    };
    addRoll(roll);
    setActiveRoll(roll.id);
    toast.success(`Created & selected roll ${roll.id}`);
    setScanModalOpen(false);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="1 · Camera Device Picker">
        <Select value={selectedDeviceId} onValueChange={(val) => {
          setSelectedDeviceId(val);
          if (val === "rear" || val === "front" || val.length > 5) {
            setStreamMode("live");
          }
          toast.success(`Camera selected: ${val}`);
        }}>
          <SelectTrigger className="h-11"><SelectValue placeholder="Select Camera" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="rear">This device · Rear camera (Environment)</SelectItem>
            <SelectItem value="front">This device · Front camera (User/Selfie)</SelectItem>
            {cams.map((c, i) => (
              <SelectItem key={c.deviceId || i} value={c.deviceId || `cam-${i}`}>
                {c.label ? `${c.label}` : `Connected USB/Webcam ${i + 1}`}
              </SelectItem>
            ))}
            {devices.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.id} · {d.name} [{d.streamRole || d.kind}] {d.pingMs ? `· ${d.pingMs}ms` : ""} {d.batteryPct ? `· ${d.batteryPct}%` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2 text-xs text-muted-foreground">
          Phones, tablets, webcams, overhead line sensors and IP/RTSP streams are all supported. Pair companion devices via QR in Devices.
        </p>
      </Panel>

      <Panel title="2 · Roll / Lot Selection">
        <div className="flex gap-2">
          <Select value={activeRollId} onValueChange={setActiveRoll}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {rolls.map((x) => (
                <SelectItem key={x.id} value={x.id}>
                  {x.id} · {x.article} ({x.shift || "Shift A"} · {x.machineNo || "Line #04"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-11 gap-2 shrink-0" onClick={() => setScanModalOpen(true)}>
            <ScanLine className="h-4 w-4" /> Scan / New
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
          <div className="rounded border border-border bg-surface-2 p-2">
            <div className="label-caps">3-Pt GSM (L/C/R)</div>
            {r.gsmLeft ?? r.gsm} / {r.gsmCenter ?? r.gsm} / {r.gsmRight ?? r.gsm}
          </div>
          <div className="rounded border border-border bg-surface-2 p-2">
            <div className="label-caps">Cuttable Width</div>
            {r.cuttableWidthIn ?? (r.widthIn - 1)} in ({r.widthIn}" gross)
          </div>
          <div className="rounded border border-border bg-surface-2 p-2">
            <div className="label-caps">Shift / Machine</div>
            <span className="truncate block">{r.shift ? r.shift.slice(0, 7) : "Shift A"} · {r.machineNo || "M#14"}</span>
          </div>
          <div className="rounded border border-border bg-surface-2 p-2">
            <div className="label-caps">Dye Batch / Lot</div>
            <span className="truncate block">{r.dyeBatch || r.lot}</span>
          </div>
        </div>
      </Panel>

      <Panel title="3 · Buyer Standard">
        <div className="rounded border border-border bg-surface-2 p-3 text-sm">
          {buyers.find((b) => b.id === r.buyerId)?.name} — limit {buyers.find((b) => b.id === r.buyerId)?.limit} ({buyers.find((b) => b.id === r.buyerId)?.system.toUpperCase()})
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Buyer standards and tolerances can be customized in Grade.</p>
      </Panel>

      <Panel title="4 · Line Location">
        <Input
          value={sessionLocation}
          onChange={(e) => setSessionLocation(e.target.value)}
          placeholder="e.g. Line #04 · Take-down"
          className="h-11"
        />
        <Button
          className="mt-4 h-11 w-full"
          onClick={() => {
            setStreamMode(selectedDeviceId ? "live" : "sim");
            toast.success(`Inspection session active for Roll ${activeRollId} at ${sessionLocation}`);
            onStartLive();
          }}
        >
          Start inspection session
        </Button>
      </Panel>

      {/* Interactive Scan / Create Roll Modal */}
      <Dialog open={scanModalOpen} onOpenChange={setScanModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scan or Register Roll Ticket (BD RMG QA Standard)</DialogTitle>
          </DialogHeader>
          <Tabs value={scanTab} onValueChange={(t) => setScanTab(t as "scan" | "create")}>
            <TabsList className="grid grid-cols-2 mb-3">
              <TabsTrigger value="scan">Scan Ticket Barcode</TabsTrigger>
              <TabsTrigger value="create">New Roll Form (Factory Specs)</TabsTrigger>
            </TabsList>
            <TabsContent value="scan" className="space-y-3">
              <div className="rounded-lg border border-dashed border-border p-4 text-center bg-surface-2">
                <QrCode className="mx-auto h-12 w-12 text-telemetry mb-2 animate-pulse" />
                <p className="text-xs text-muted-foreground">Scan 1D barcode or 2D QR roll ticket from inspection batch</p>
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="Enter barcode / ticket ID (e.g. TX-1001)"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="h-9 text-xs font-mono"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSimulateScan(); }}
                  />
                  <Button size="sm" onClick={() => handleSimulateScan()}>Match</Button>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                <span>Quick demo barcodes:</span>
                <div className="flex gap-1.5 font-mono">
                  {["TX-1001", "TX-8829", "TX-8827"].map((code) => (
                    <button
                      key={code}
                      onClick={() => handleSimulateScan(code)}
                      className="px-2 py-0.5 rounded bg-accent text-[11px] hover:text-primary cursor-pointer"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="create" className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="label-caps block mb-1">Roll ID</label>
                  <Input value={newRollId} onChange={(e) => setNewRollId(e.target.value)} className="h-8 font-mono text-xs" />
                </div>
                <div>
                  <label className="label-caps block mb-1">Buyer</label>
                  <Select value={newBuyerId} onValueChange={setNewBuyerId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {buyers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <label className="label-caps block mb-1">Article Description</label>
                  <Input value={newArticle} onChange={(e) => setNewArticle(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="label-caps block mb-1">Fabric Type</label>
                  <Select value={newFabricType} onValueChange={setNewFabricType}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BD_FABRIC_TYPES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="label-caps block mb-1">Yarn Count</label>
                  <Select value={newYarnCount} onValueChange={setNewYarnCount}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BD_YARN_COUNTS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="label-caps block mb-1">Shift</label>
                  <Select value={newShift} onValueChange={setNewShift}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BD_SHIFTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="label-caps block mb-1">Machine / Cylinder ID</label>
                  <Input value={newMachineNo} onChange={(e) => setNewMachineNo(e.target.value)} className="h-8 text-xs" placeholder="e.g. Mayer & Cie #14" />
                </div>
                <div>
                  <label className="label-caps block mb-1">Dye Lot / Batch</label>
                  <Input value={newDyeBatch} onChange={(e) => setNewDyeBatch(e.target.value)} className="h-8 font-mono text-xs" />
                </div>
                <div>
                  <label className="label-caps block mb-1">Target GSM</label>
                  <Input type="number" value={newGsm} onChange={(e) => setNewGsm(Number(e.target.value))} className="h-8 text-xs" />
                </div>
                <div className="col-span-2 rounded border border-border bg-surface-2/60 p-2">
                  <span className="label-caps block text-telemetry mb-1.5">3-Point GSM Cut Verification (ASTM D3776)</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground block">Left GSM</label>
                      <Input type="number" value={newGsmLeft} onChange={(e) => setNewGsmLeft(Number(e.target.value))} className="h-7 text-xs font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block">Center GSM</label>
                      <Input type="number" value={newGsmCenter} onChange={(e) => setNewGsmCenter(Number(e.target.value))} className="h-7 text-xs font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block">Right GSM</label>
                      <Input type="number" value={newGsmRight} onChange={(e) => setNewGsmRight(Number(e.target.value))} className="h-7 text-xs font-mono" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="label-caps block mb-1">Total Width (in)</label>
                  <Input type="number" value={newWidth} onChange={(e) => {
                    const w = Number(e.target.value);
                    setNewWidth(w);
                    setNewCuttableWidth(Math.max(w - 1, 10));
                  }} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="label-caps block mb-1">Cuttable Width (in)</label>
                  <Input type="number" value={newCuttableWidth} onChange={(e) => setNewCuttableWidth(Number(e.target.value))} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="label-caps block mb-1">Length (m)</label>
                  <Input type="number" value={newLength} onChange={(e) => setNewLength(Number(e.target.value))} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="label-caps block mb-1">Bow / Skew (%)</label>
                  <Input type="number" step="0.1" value={newSkewPct} onChange={(e) => setNewSkewPct(Number(e.target.value))} className="h-8 text-xs font-mono" />
                </div>
              </div>
              <DialogFooter className="mt-3">
                <Button size="sm" variant="ghost" onClick={() => setScanModalOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleCreateRoll} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Create & Inspect</Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CaptureQuality() {
  const telemetry = useTensora((s) => s.captureTelemetry);
  const streamMode = useTensora((s) => s.streamMode);
  const selectedDeviceId = useTensora((s) => s.selectedDeviceId);

  const metrics = [
    {
      k: "Lighting uniformity",
      v: telemetry.lighting,
      tip: telemetry.lighting >= 80 ? "Even, diffuse illumination. Optimal." : "Lighting dropped below threshold — move closer to lamp or enable torch.",
    },
    {
      k: "Focus sharpness",
      v: telemetry.focus,
      tip: telemetry.focus >= 80 ? "Sharp edge focus across fabric yarns." : "Hold 30–45 cm from fabric surface to lock focal plane.",
    },
    {
      k: "Motion blur",
      v: telemetry.motionBlur,
      tip: telemetry.motionBlur >= 75 ? "Minimal motion blur at active speed." : "Reduce take-down speed or brace camera mount.",
    },
    {
      k: "Coverage (width)",
      v: telemetry.coverage,
      tip: telemetry.coverage >= 80 ? "Optimal coverage across roll width." : "Move back ~15 cm to capture complete 60\" fabric width.",
    },
    {
      k: "Colour fidelity",
      v: telemetry.colorFidelity,
      tip: telemetry.colorFidelity >= 90 ? "White balance locked to standard D65 illuminant." : "Recalibrate white point using Araneid reference card.",
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        title="Live capture diagnostics"
        action={
          <span className="font-mono text-xs text-muted-foreground">
            {streamMode === "live" ? `Device: ${selectedDeviceId}` : "Simulated Edge Stream"}
          </span>
        }
      >
        <div className="space-y-4">
          {telemetry.tip && (
            <div className="rounded-md border border-telemetry/30 bg-telemetry/10 p-2.5 text-xs text-telemetry">
              <b>AI Optical Assistant:</b> {telemetry.tip}
            </div>
          )}
          {metrics.map((m) => (
            <div key={m.k}>
              <div className="flex justify-between text-sm">
                <span>{m.k}</span>
                <span className={`font-mono ${m.v >= 80 ? "text-pass" : "text-minor"}`}>{m.v}%</span>
              </div>
              <Progress value={m.v} className="mt-1.5 h-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">{m.tip}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Operator guidance">
        <ul className="space-y-3 text-sm">
          {[
            [telemetry.lighting >= 75, "Camera calibrated with Araneid reference card (D65)"],
            [true, "Model TX-Vision-9 loaded on edge station (GPU-accelerated)"],
            [telemetry.coverage >= 70, telemetry.coverage >= 70 ? "Full fabric width in optical frame" : "Move back ~15 cm to capture full width"],
            [telemetry.focus >= 75, telemetry.focus >= 75 ? "Optimal focal distance (35-45 cm)" : "Focal plane drift detected — steady device"],
            [true, "Local outbox active — zero-latency offline buffering"],
          ].map(([ok, t], idx) => (
            <li key={idx} className="flex items-start gap-2">
              {ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pass" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-minor" />
              )}
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
