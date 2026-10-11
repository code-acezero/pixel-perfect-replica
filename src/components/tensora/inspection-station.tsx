import { useEffect, useRef, useState } from "react";
import { Camera, Download, Pause, Play, PlusCircle, Square, VideoOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFECT_CLASSES, DEFAULT_POINTS, type DefectClass } from "@/lib/tensora/data";
import { useTensora } from "@/lib/tensora/store";

interface Det {
  cls: DefectClass;
  conf: number;
  points: number;
  x: number; // 0..1
  y: number; // px (top)
  w: number;
  h: number;
  logged: boolean;
  ttl: number; // live mode frames
}

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function makeKnitTile() {
  const t = document.createElement("canvas");
  t.width = 12;
  t.height = 10;
  const c = t.getContext("2d")!;
  c.fillStyle = "#d9d4c7";
  c.fillRect(0, 0, 12, 10);
  c.strokeStyle = "#b9b2a2";
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(1, 1);
  c.lineTo(6, 9);
  c.lineTo(11, 1);
  c.stroke();
  c.strokeStyle = "#ece8de";
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(2, 0);
  c.lineTo(6, 7);
  c.lineTo(10, 0);
  c.stroke();
  return t;
}

function drawArtifact(ctx: CanvasRenderingContext2D, d: Det, W: number) {
  const cx = d.x * W;
  const cy = d.y + d.h / 2;
  ctx.save();
  switch (d.cls) {
    case "Needle Line":
      ctx.strokeStyle = "rgba(90,82,70,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, d.y);
      ctx.lineTo(cx, d.y + d.h);
      ctx.stroke();
      break;
    case "Oil Stain":
      ctx.fillStyle = "rgba(120,92,40,0.45)";
      ctx.beginPath();
      ctx.ellipse(cx, cy, d.w / 2.6, d.h / 3, 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "Hole":
    case "Drop Stitch":
      ctx.fillStyle = "rgba(20,20,24,0.85)";
      ctx.beginPath();
      ctx.ellipse(cx, cy, d.w / 5, d.h / 4, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "Warp Float":
    case "Barre":
      ctx.fillStyle = "rgba(250,248,240,0.8)";
      ctx.fillRect(cx - d.w / 2.2, cy - 3, d.w / 1.1, 6);
      break;
    default:
      ctx.fillStyle = "rgba(160,150,130,0.7)";
      ctx.fillRect(cx - d.w / 4, cy - 2, d.w / 2, 4);
  }
  ctx.restore();
}

export function InspectionStation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const detsRef = useRef<Det[]>([]);
  const offsetRef = useRef(0);
  const [camError, setCamError] = useState<string | null>(null);
  const [inference, setInference] = useState(18);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCls, setManualCls] = useState<DefectClass>("Needle Line");
  const [manualPts, setManualPts] = useState("2");

  const { streamMode, paused, setPaused, speed, advance, addDefect, activeRollId, activeSessionId, setStreamMode } = useTensora();
  const roll = useTensora((s) => s.rolls.find((r) => r.id === s.activeRollId)!);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const lengthRef = useRef(roll.lengthM);
  lengthRef.current = roll.lengthM;

  // Camera lifecycle
  useEffect(() => {
    if (streamMode !== "live") return;
    let stream: MediaStream | null = null;
    setCamError(null);
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
      })
      .catch((e: Error) => setCamError(e.message || "Camera unavailable"));
    if (!navigator.mediaDevices) setCamError("Camera not supported in this browser");
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [streamMode]);

  // Meter advance
  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) {
        advance(speed / 60);
        setInference(14 + Math.round(Math.random() * 8));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [advance, speed]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const tile = makeKnitTile();
    const pattern = ctx.createPattern(tile, "repeat")!;
    const major = cssVar("--major");
    const minor = cssVar("--minor");
    let raf = 0;
    let nextSpawn = performance.now() + 2500;

    const capture = (d: Det) => {
      const t = document.createElement("canvas");
      t.width = 128;
      t.height = 96;
      const sx = Math.max(d.x * canvas.width - d.w, 0);
      const sy = Math.max(d.y - d.h / 2, 0);
      t.getContext("2d")!.drawImage(canvas, sx, sy, d.w * 2, d.h * 2, 0, 0, 128, 96);
      return t.toDataURL("image/jpeg", 0.7);
    };

    const loop = (now: number) => {
      const W = canvas.width;
      const H = canvas.height;
      const live = streamMode === "live" && videoRef.current && videoRef.current.readyState >= 2;
      const isPaused = pausedRef.current;
      const step = isPaused ? 0 : (speed / 42) * 2.2;

      if (live) {
        ctx.drawImage(videoRef.current!, 0, 0, W, H);
      } else {
        offsetRef.current = (offsetRef.current + step) % 10;
        ctx.save();
        ctx.translate(0, offsetRef.current);
        ctx.fillStyle = pattern;
        ctx.fillRect(0, -10, W, H + 20);
        ctx.restore();
        // lighting vignette
        const g = ctx.createRadialGradient(W / 2, H / 2, H / 4, W / 2, H / 2, W / 1.2);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      // spawn
      if (!isPaused && now > nextSpawn) {
        const cls = DEFECT_CLASSES[Math.floor(Math.random() * 5)];
        const w = cls === "Needle Line" ? 40 : 70 + Math.random() * 40;
        const h = cls === "Needle Line" ? 160 : 60 + Math.random() * 40;
        detsRef.current.push({
          cls,
          conf: 0.82 + Math.random() * 0.17,
          points: DEFAULT_POINTS[cls],
          x: 0.12 + Math.random() * 0.76,
          y: live ? H * (0.2 + Math.random() * 0.5) : -h,
          w,
          h,
          logged: false,
          ttl: 120,
        });
        nextSpawn = now + 5000 + Math.random() * 6000;
      }

      // detections
      detsRef.current = detsRef.current.filter((d) => (live ? d.ttl > 0 : d.y < H + 20));
      for (const d of detsRef.current) {
        if (live) d.ttl -= isPaused ? 0 : 1;
        else {
          d.y += step;
          drawArtifact(ctx, d, W);
        }
        const visible = live || d.y + d.h > H * 0.25;
        if (!visible) continue;
        const color = d.points >= 3 ? major : minor;
        const bx = d.x * W - d.w / 2;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(bx, d.y, d.w, d.h);
        const label = `${d.cls}  ${(d.conf * 100).toFixed(1)}%`;
        ctx.font = "600 18px 'JetBrains Mono', monospace";
        const tw = ctx.measureText(label).width + 12;
        ctx.fillStyle = color;
        ctx.fillRect(bx - 1.5, d.y - 26, tw, 24);
        ctx.fillStyle = "#020617";
        ctx.fillText(label, bx + 5, d.y - 8);

        if (!d.logged && (live || d.y > H * 0.4)) {
          d.logged = true;
          addDefect({
            rollId: activeRollId,
            sessionId: activeSessionId,
            ts: Date.now(),
            meter: lengthRef.current,
            x: d.x,
            cls: d.cls,
            points: d.points,
            confidence: +d.conf.toFixed(3),
            status: "pending",
            source: "ai",
            thumb: capture(d),
          });
          toast(`${d.cls} detected · ${d.points} pt`, { description: `${(d.conf * 100).toFixed(1)}% at ${lengthRef.current.toFixed(1)} m` });
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [streamMode, speed, addDefect, activeRollId, activeSessionId]);

  const snapshot = () => {
    const url = canvasRef.current!.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `tensora-${roll.id}-${roll.lengthM.toFixed(1)}m.png`;
    a.click();
    toast.success("Snapshot saved");
  };

  const logManual = () => {
    const c = canvasRef.current!;
    const t = document.createElement("canvas");
    t.width = 128;
    t.height = 96;
    t.getContext("2d")!.drawImage(c, c.width / 2 - 128, c.height / 2 - 96, 256, 192, 0, 0, 128, 96);
    addDefect({
      rollId: activeRollId,
      sessionId: activeSessionId,
      ts: Date.now(),
      meter: roll.lengthM,
      x: 0.5,
      cls: manualCls,
      points: Number(manualPts),
      confidence: 1,
      status: "confirmed",
      source: "manual",
      thumb: t.toDataURL("image/jpeg", 0.7),
    });
    setManualOpen(false);
    toast.success(`Manual flaw logged · ${manualCls} ${manualPts} pt`);
  };

  return (
    <div className="space-y-3">
      <div className="scanline relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-surface-2">
        <canvas ref={canvasRef} width={1280} height={720} className="h-full w-full" />
        <video ref={videoRef} playsInline muted className="hidden" />
        {/* HUD */}
        <div className="pointer-events-none absolute inset-0 p-2 font-mono text-[10px] text-telemetry sm:p-3 sm:text-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 rounded bg-background/75 px-2 py-1.5 backdrop-blur">
              <div>SPEED: {paused ? 0 : speed} m/min</div>
              <div>CAMERA: {streamMode === "live" ? "Device cam · Auto" : "4K 60fps Edge-Sync"}</div>
              <div>INFERENCE: {inference}ms</div>
            </div>
            <div className="space-y-1 rounded bg-background/75 px-2 py-1.5 text-right backdrop-blur">
              <div className="flex items-center justify-end gap-1.5">
                <span className={paused ? "h-2 w-2 rounded-full bg-minor" : "h-2 w-2 animate-pulse rounded-full bg-major"} />
                {paused ? "PAUSED" : streamMode === "live" ? "LIVE" : "SIM"}
              </div>
              <div>ROLL {roll.id}</div>
              <div>{roll.lengthM.toFixed(1)} m</div>
            </div>
          </div>
        </div>
        {streamMode === "live" && camError && (
          <div className="absolute inset-0 grid place-items-center bg-background/85 p-6 text-center">
            <div>
              <VideoOff className="mx-auto h-8 w-8 text-minor" />
              <p className="mt-2 text-sm font-medium">Camera unavailable</p>
              <p className="mt-1 text-xs text-muted-foreground">{camError}. Allow camera access or switch to the simulated stream.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setStreamMode("sim")}>Use simulated stream</Button>
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        <Button variant={paused ? "default" : "secondary"} className="h-11 gap-2 sm:h-10" onClick={() => setPaused(!paused)}>
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          <span className="truncate">{paused ? "Resume" : "Pause Inspection"}</span>
        </Button>
        <Button variant="outline" className="h-11 gap-2 sm:h-10" onClick={() => setManualOpen(true)}>
          <PlusCircle className="h-4 w-4" /> <span className="truncate">Log Manual Flaw</span>
        </Button>
        <Button variant="outline" className="h-11 gap-2 sm:h-10" onClick={snapshot}>
          <Camera className="h-4 w-4" /> <span className="truncate">Snapshot</span>
        </Button>
        <Button variant="ghost" className="col-span-3 h-10 gap-2 text-muted-foreground sm:ml-auto" onClick={() => { setPaused(true); toast("Session paused — review in Triage, then certify"); }}>
          <Square className="h-4 w-4" /> End Session <Download className="hidden" />
        </Button>
      </div>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log manual flaw @ {roll.lengthM.toFixed(1)} m</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="label-caps mb-1.5">Defect class</div>
              <Select value={manualCls} onValueChange={(v) => { setManualCls(v as DefectClass); setManualPts(String(DEFAULT_POINTS[v as DefectClass])); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEFECT_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="label-caps mb-1.5">Penalty points</div>
              <Select value={manualPts} onValueChange={setManualPts}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 pt · up to 3 in</SelectItem>
                  <SelectItem value="2">2 pt · 3–6 in</SelectItem>
                  <SelectItem value="3">3 pt · 6–9 in</SelectItem>
                  <SelectItem value="4">4 pt · over 9 in / hole</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setManualOpen(false)}>Cancel</Button>
            <Button onClick={logManual}>Log flaw</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
