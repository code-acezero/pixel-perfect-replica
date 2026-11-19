import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import QRCode from "qrcode";
import {
  Plus,
  Smartphone,
  Tablet,
  Video,
  Webcam,
  Cctv,
  ExternalLink,
  Check,
  RotateCw,
  Flashlight,
  BatteryCharging,
  Wifi,
  Activity,
  Radio,
  SlidersHorizontal,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Panel, Tag } from "@/components/tensora/ui";
import { useTensora } from "@/lib/tensora/store";
import { DEVICE_STREAM_ROLES, type Device, type DeviceStreamRole } from "@/lib/tensora/data";

export const Route = createFileRoute("/_authenticated/devices")({
  head: () => ({
    meta: [
      { title: "Tensora Devices — Industrial Camera Fleet · Araneid" },
      { name: "description", content: "Pair companion tablets, inspection overhead frames, backlights, and IP RTSP cameras." },
      { property: "og:title", content: "Tensora Devices — Araneid" },
      { property: "og:description", content: "Manage your industrial camera fleet." },
    ],
  }),
  component: DevicesPage,
});

const ICON: Record<Device["kind"], typeof Smartphone> = {
  Phone: Smartphone,
  Tablet,
  Webcam,
  "USB Camera": Video,
  "IP Camera": Cctv,
};

const ROLE_BADGE: Record<DeviceStreamRole, { label: string; tone: "pass" | "major" | "minor" | "default" }> = {
  overhead_main: { label: "Overhead Table", tone: "pass" },
  backlight_sensor: { label: "Backlight LED", tone: "minor" },
  companion_handheld: { label: "Companion Scanner", tone: "default" },
  ip_rtsp: { label: "IP/RTSP Stream", tone: "major" },
};

function DevicesPage() {
  const navigate = useNavigate();
  const { devices, pairDevice, updateDevice, setSelectedDeviceId, setStreamMode } = useTensora();
  const [open, setOpen] = useState(false);
  const [pairTab, setPairTab] = useState<"companion" | "rtsp">("companion");
  const [qr, setQr] = useState("");
  const [pairId, setPairId] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [deviceName, setDeviceName] = useState("Companion Rover Tablet");
  const [deviceKind, setDeviceKind] = useState<Device["kind"]>("Tablet");
  const [deviceRole, setDeviceRole] = useState<DeviceStreamRole>("companion_handheld");
  const [deviceLoc, setDeviceLoc] = useState("Line #04 · Circular Knit Table");
  const [rtspUrl, setRtspUrl] = useState("rtsp://192.168.1.120:554/live/ch0");
  const [pinging, setPinging] = useState(false);

  useEffect(() => {
    if (open) {
      const generatedId = `CAM-${Date.now().toString(36).slice(-4).toUpperCase()}`;
      const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
      setPairId(generatedId);
      setPinCode(generatedPin);
      const url = `${window.location.origin}/capture?pair=${generatedId}&pin=${generatedPin}`;
      void QRCode.toDataURL(url, { margin: 1, width: 220 }).then(setQr);
    }
  }, [open]);

  const handlePairAndLaunch = () => {
    const isRtsp = pairTab === "rtsp";
    const finalKind: Device["kind"] = isRtsp ? "IP Camera" : deviceKind;
    const finalRole: DeviceStreamRole = isRtsp ? "ip_rtsp" : deviceRole;

    pairDevice(pairId, {
      name: deviceName || `Camera ${pairId}`,
      kind: finalKind,
      location: deviceLoc,
      status: "online",
      resolution: isRtsp ? "4K UHD" : finalKind === "Phone" || finalKind === "Tablet" ? "1440p" : "1080p",
      fps: isRtsp ? 30 : 60,
      quality: 95,
      lastSession: "INS-LIVE",
      calibrated: true,
      batteryPct: isRtsp ? 100 : 92,
      streamRole: finalRole,
      streamUrl: isRtsp ? rtspUrl : "",
      torchOn: false,
      pingMs: isRtsp ? 18 : 12,
    });
    setOpen(false);
    toast.success(`Paired device ${pairId} (${finalRole})`);
    setSelectedDeviceId(pairId);
    setStreamMode("live");
    navigate({ to: "/capture", search: { pair: pairId, tab: "live" } });
  };

  const handleToggleStatus = (d: Device) => {
    const nextStatus = d.status === "online" ? "idle" : "online";
    updateDevice(d.id, { status: nextStatus, lastSession: "Just now" });
    toast(`Device ${d.id} is now ${nextStatus}`);
  };

  const handleToggleTorch = (d: Device) => {
    const nextTorch = !d.torchOn;
    updateDevice(d.id, { torchOn: nextTorch });
    toast.success(`Inspection flashlight on ${d.id} is now ${nextTorch ? "ON" : "OFF"}`);
  };

  const handleCalibrate = (d: Device) => {
    updateDevice(d.id, { calibrated: true, quality: Math.min(99, d.quality + 4) });
    toast.success(`Device ${d.id} optical white-balance & illumination calibrated`);
  };

  const handlePingFleet = () => {
    setPinging(true);
    setTimeout(() => {
      devices.forEach((d) => {
        const jitter = Math.floor(8 + Math.random() * 15);
        updateDevice(d.id, { pingMs: jitter, lastSession: "Active now" });
      });
      setPinging(false);
      toast.success("Fleet heartbeat telemetry synchronized.");
    }, 450);
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <PageHeader
        module="Tensora Devices"
        title="Industrial Camera Fleet & Edge Ecosystem"
        description="Unified connectivity for overhead line inspection frames, backlit transillumination tables, mobile companion tablets, and industrial RTSP streams."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs font-mono" onClick={handlePingFleet} disabled={pinging}>
              <Activity className={`h-3.5 w-3.5 text-telemetry ${pinging ? "animate-pulse" : ""}`} />
              {pinging ? "Pinging fleet…" : "Ping Fleet (Heartbeat)"}
            </Button>
            <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Pair device
            </Button>
          </div>
        }
      />

      {/* Fleet Overview Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Panel className="p-3">
          <div className="label-caps text-[10px]">Active Inspection Nodes</div>
          <div className="mt-1 flex items-baseline gap-2 font-mono text-xl font-bold text-foreground">
            {devices.filter((d) => d.status === "online").length}
            <span className="text-xs font-normal text-muted-foreground">/ {devices.length} registered</span>
          </div>
        </Panel>
        <Panel className="p-3">
          <div className="label-caps text-[10px]">Avg Edge Latency</div>
          <div className="mt-1 flex items-baseline gap-2 font-mono text-xl font-bold text-pass">
            {Math.round(devices.reduce((acc, d) => acc + (d.pingMs ?? 15), 0) / (devices.length || 1))} ms
            <span className="text-xs font-normal text-muted-foreground">round-trip</span>
          </div>
        </Panel>
        <Panel className="p-3">
          <div className="label-caps text-[10px]">Lighting Calibration</div>
          <div className="mt-1 flex items-baseline gap-2 font-mono text-xl font-bold text-telemetry">
            {Math.round((devices.filter((d) => d.calibrated).length / (devices.length || 1)) * 100)}%
            <span className="text-xs font-normal text-muted-foreground">ASTM D5430 lux ready</span>
          </div>
        </Panel>
        <Panel className="p-3">
          <div className="label-caps text-[10px]">Overhead & RTSP Streams</div>
          <div className="mt-1 flex items-baseline gap-2 font-mono text-xl font-bold text-foreground">
            {devices.filter((d) => d.streamRole === "overhead_main" || d.streamRole === "ip_rtsp").length}
            <span className="text-xs font-normal text-muted-foreground">continuous lines</span>
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {devices.map((d) => {
          const Icon = ICON[d.kind];
          const roleInfo = ROLE_BADGE[d.streamRole || "overhead_main"];
          return (
            <Panel key={d.id} className="relative overflow-hidden hover:-translate-y-1 hover:border-primary/50 hover:shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.1),inset_-2px_-2px_4px_rgba(0,0,0,0.5),0_14px_30px_-6px_rgba(0,0,0,0.75)] transition-all duration-300 ease-[cubic-bezier(0.18,0.9,0.28,1)]">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/80 bg-surface-2 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.08),inset_-1px_-1px_2px_rgba(0,0,0,0.4)]">
                  <Icon className="h-5 w-5 text-telemetry" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium text-sm text-foreground">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[10px] text-muted-foreground">{d.id}</span>
                    <Tag tone={roleInfo.tone}>{roleInfo.label}</Tag>
                  </div>
                </div>
                <button onClick={() => handleToggleStatus(d)} title="Click to toggle status" className="cursor-pointer active:scale-95 transition-transform">
                  <Tag tone={d.status === "online" ? "pass" : d.status === "idle" ? "minor" : "default"}>
                    {d.status}
                  </Tag>
                </button>
              </div>

              <dl className="mt-4 grid grid-cols-4 gap-2 font-mono text-xs border border-border/60 py-2.5 px-2 bg-surface-2/40 rounded-lg shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.5)]">
                <div>
                  <dt className="label-caps text-[9px]">Resolution</dt>
                  <dd className="mt-0.5 font-medium">{d.resolution}</dd>
                </div>
                <div>
                  <dt className="label-caps text-[9px]">Rate</dt>
                  <dd className="mt-0.5 font-medium">{d.fps} FPS</dd>
                </div>
                <div>
                  <dt className="label-caps text-[9px]">Latency</dt>
                  <dd className="mt-0.5 font-medium text-pass flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-pass" />
                    {d.pingMs ?? 14}ms
                  </dd>
                </div>
                <div>
                  <dt className="label-caps text-[9px]">Battery</dt>
                  <dd className="mt-0.5 font-medium text-foreground flex items-center gap-1">
                    <BatteryCharging className="h-3 w-3 text-telemetry" />
                    {d.batteryPct ?? 100}%
                  </dd>
                </div>
              </dl>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate max-w-[180px]">{d.location}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleTorch(d)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-mono text-[10px] transition-all duration-200 ease-[cubic-bezier(0.18,0.9,0.28,1)] hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                      d.torchOn
                        ? "bg-amber-500/25 text-amber-300 border border-amber-500/60 shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.2),inset_-1px_-1px_2px_rgba(0,0,0,0.5)]"
                        : "bg-surface-2 border border-border text-muted-foreground shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.08),inset_-1px_-1px_2px_rgba(0,0,0,0.4)]"
                    }`}
                    title="Toggle hardware inspection flashlight"
                  >
                    <Flashlight className="h-3 w-3" />
                    {d.torchOn ? "Torch On" : "Torch Off"}
                  </button>

                  <button
                    onClick={() => handleCalibrate(d)}
                    className={`rounded-lg px-2 py-0.5 font-mono text-[10px] border transition-all duration-200 ease-[cubic-bezier(0.18,0.9,0.28,1)] hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                      d.calibrated
                        ? "border-pass/80 bg-pass/20 text-pass shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.15),inset_-1px_-1px_2px_rgba(0,0,0,0.4)]"
                        : "border-minor/80 bg-minor/20 text-minor shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.15),inset_-1px_-1px_2px_rgba(0,0,0,0.4)]"
                    }`}
                  >
                    {d.calibrated ? "Calibrated" : "Calibrate"}
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">Last session: {d.lastSession || "Ready"}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 font-mono"
                  onClick={() => {
                    setSelectedDeviceId(d.id);
                    setStreamMode("live");
                    navigate({ to: "/capture", search: { pair: d.id, tab: "live" } });
                  }}
                >
                  <Radio className="h-3 w-3 text-telemetry" /> Connect stream
                </Button>
              </div>
            </Panel>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg text-left">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Pair Inspection Camera or Industrial Stream</DialogTitle>
          </DialogHeader>

          <Tabs value={pairTab} onValueChange={(t) => setPairTab(t as "companion" | "rtsp")}>
            <TabsList className="grid grid-cols-2 h-9 mb-3">
              <TabsTrigger value="companion" className="text-xs">Companion Mobile / Tablet</TabsTrigger>
              <TabsTrigger value="rtsp" className="text-xs">Industrial IP / RTSP Camera</TabsTrigger>
            </TabsList>

            <TabsContent value="companion" className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-lg border border-border bg-surface-2 p-3.5">
                {qr ? (
                  <img src={qr} alt="Pairing QR code" className="h-40 w-40 shrink-0 rounded bg-foreground p-2 shadow-md" />
                ) : (
                  <div className="h-40 w-40 shrink-0 rounded bg-secondary" />
                )}
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">Scan with Inspector Tablet or Phone</div>
                  <p>
                    Point any camera device at this QR code to instantly launch the Tensora inspector rover interface.
                  </p>
                  <div className="mt-2 pt-2 border-t border-border/60">
                    <div className="label-caps text-[9px]">Manual 6-Digit PIN fallback:</div>
                    <div className="font-mono text-lg font-bold text-telemetry tracking-widest">{pinCode}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="label-caps block mb-1">Device Name</label>
                  <Input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="label-caps block mb-1">Stream Role</label>
                  <Select value={deviceRole} onValueChange={(v) => setDeviceRole(v as DeviceStreamRole)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEVICE_STREAM_ROLES.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="label-caps block mb-1">Hardware Type</label>
                  <Select value={deviceKind} onValueChange={(v) => setDeviceKind(v as Device["kind"])}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tablet">Tablet (Rover / Table Stand)</SelectItem>
                      <SelectItem value="Phone">Phone (Inspector Wand)</SelectItem>
                      <SelectItem value="USB Camera">USB Industrial / DSLR</SelectItem>
                      <SelectItem value="Webcam">Standard Webcam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="label-caps block mb-1">Plant Location</label>
                  <Input value={deviceLoc} onChange={(e) => setDeviceLoc(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rtsp" className="space-y-3">
              <div className="rounded-lg border border-border bg-surface-2 p-3.5 space-y-2 text-xs">
                <div className="font-medium text-foreground flex items-center gap-2">
                  <Cctv className="h-4 w-4 text-telemetry" /> Direct Network Camera Ingestion (RTSP / ONVIF)
                </div>
                <p className="text-muted-foreground">
                  Connect high-speed line scan cameras or overhead security cameras (Basler ace, Hikvision 8MP, Dahua) mounted directly on circular knitting take-downs.
                </p>
                <div className="mt-2 space-y-2">
                  <div>
                    <label className="label-caps block mb-1">RTSP / HTTP Stream URL</label>
                    <Input
                      value={rtspUrl}
                      onChange={(e) => setRtspUrl(e.target.value)}
                      placeholder="rtsp://192.168.1.120:554/live/ch0"
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label-caps block mb-1">Camera Label</label>
                      <Input
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        placeholder="Line #04 Take-down RTSP"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="label-caps block mb-1">Machine / Station</label>
                      <Input
                        value={deviceLoc}
                        onChange={(e) => setDeviceLoc(e.target.value)}
                        placeholder="Mayer & Cie #14 Take-down"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-3 flex flex-col sm:flex-row gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" className="gap-1.5" onClick={handlePairAndLaunch}>
              <ExternalLink className="h-3.5 w-3.5" /> Save & Launch Station
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
