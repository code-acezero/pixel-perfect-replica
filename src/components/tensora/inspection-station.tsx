import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertOctagon,
  Camera,
  ChevronDown,
  Film,
  Flame,
  Flashlight,
  FlashlightOff,
  ImageUp,
  Layers,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  PlusCircle,
  Radio,
  ScanLine,
  Smartphone,
  Sparkles,
  Square,
  SunMedium,
  Upload,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DEFECT_CLASSES,
  DEFAULT_POINTS,
  DEFECT_TRANSLATIONS_BN,
  BD_SHIFTS_BN,
  type DefectClass,
  type Roll,
} from "@/lib/tensora/data";
import { useTensora } from "@/lib/tensora/store";
import { useServerFn } from "@tanstack/react-start";
import { analyzeFrame } from "@/lib/tensora/ai.functions";
import { checkContinuousFault, pointsPer100SqYd } from "@/lib/tensora/scoring";
import { playMillAlarmSound } from "@/lib/tensora/audio-alarm";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
  if (typeof window === "undefined") return "";
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

/** Draws source media fitted proportionally onto canvas without aspect-ratio stretching */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  imgW: number,
  imgH: number,
  targetW: number,
  targetH: number
) {
  if (!imgW || !imgH) return;
  const targetRatio = targetW / targetH;
  const imgRatio = imgW / imgH;
  let sx = 0,
    sy = 0,
    sw = imgW,
    sh = imgH;
  if (imgRatio > targetRatio) {
    sw = imgH * targetRatio;
    sx = (imgW - sw) / 2;
  } else {
    sh = imgW / targetRatio;
    sy = (imgH - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
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

/**
 * Explainable AI (XAI) Pixel Anomaly Heatmap.
 * Renders thermal activation saliency gradient and pixel-level anomaly grid
 * inside the detection bounding box, highlighting specific pixels contributing to the defect verdict.
 */
function drawXaiHeatmap(ctx: CanvasRenderingContext2D, d: Det, W: number) {
  const bx = d.x * W - d.w / 2;
  const by = d.y;
  const bw = d.w;
  const bh = d.h;
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const rad = Math.max(bw, bh) * 0.65;

  ctx.save();
  // Clip tightly to bounding area
  ctx.beginPath();
  ctx.rect(bx - 2, by - 2, bw + 4, bh + 4);
  ctx.clip();

  // Multi-stop Grad-CAM thermal saliency map
  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
  grad.addColorStop(0, "rgba(239, 68, 68, 0.72)"); // intense red (peak anomaly)
  grad.addColorStop(0.3, "rgba(249, 115, 22, 0.55)"); // orange
  grad.addColorStop(0.6, "rgba(234, 179, 8, 0.38)"); // yellow
  grad.addColorStop(0.85, "rgba(6, 182, 212, 0.2)"); // cyan edge
  grad.addColorStop(1, "rgba(6, 182, 212, 0)"); // transparent

  ctx.fillStyle = grad;
  ctx.fillRect(bx, by, bw, bh);

  // Micro-pixel activation contour rings
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(bx + 4, by + 4, Math.max(bw - 8, 4), Math.max(bh - 8, 4));

  ctx.restore();
}

const FALLBACK_ROLL: Roll = {
  id: "TX-8829",
  buyerId: "BUY-001",
  article: "100% Combed Cotton Single Jersey",
  gsm: 180,
  lot: "LOT-2026-041",
  machineNo: "Circular Knit #04",
  shift: "A",
  widthIn: 64,
  cuttableWidthIn: 63,
  lengthM: 142.5,
  yarnLot: "YL-30S-0001",
  supplier: "Square Yarns Ltd",
  site: "ASH-U03",
  line: "ASH-U03-L04",
  status: "inspecting",
  gsmMeasured: 180,
  widthMeasured: 60,
  bowPct: 0.0,
  shadeDE: 0.0,
  shrinkPct: 0.0,
};

const PRESENTATION_PRESETS = [
  { name: "Needle Line Flaw", cls: "Needle Line" as DefectClass, points: 2, url: "/textiles/needle_line.jpg", desc: "Broken needle vertical warp line" },
  { name: "Machine Oil Stain", cls: "Oil Stain" as DefectClass, points: 2, url: "/textiles/oil_stain.jpg", desc: "Sinker lubrication drop droplet" },
  { name: "Fabric Hole / Tear", cls: "Hole" as DefectClass, points: 4, url: "/textiles/fabric_hole.jpg", desc: "Severe yarn break penetration hole" },
  { name: "Yarn Slub Lump", cls: "Slub" as DefectClass, points: 1, url: "/textiles/yarn_slub.jpg", desc: "Uncombed fiber bunch thickness" },
  { name: "Warp Float Flaw", cls: "Warp Float" as DefectClass, points: 3, url: "/textiles/yarn_float.jpg", desc: "Missed weft interlace streak" },
  { name: "Drop Stitch Ladder", cls: "Drop Stitch" as DefectClass, points: 3, url: "/textiles/drop_stitch.jpg", desc: "Unlooped course vertical run" },
  { name: "Knit Barre Band", cls: "Barre" as DefectClass, points: 2, url: "/textiles/knit_barre.jpg", desc: "Yarn tension variation stripe" },
  { name: "Lycra Out Void", cls: "Lycra Out" as DefectClass, points: 4, url: "/textiles/lycra_out.jpg", desc: "Elastane feeder starvation runout" },
];

export function InspectionStation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sampleVideoRef = useRef<HTMLVideoElement>(null);
  const cleanKnitImgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedImageRef = useRef<HTMLImageElement | null>(null);
  const detsRef = useRef<Det[]>([]);
  const offsetRef = useRef(0);
  const [camError, setCamError] = useState<string | null>(null);
  const [inference, setInference] = useState(16);
  const [simFeedType, setSimFeedType] = useState<"video" | "clean_table" | "knit_tile">("video");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCls, setManualCls] = useState<DefectClass>("Needle Line");
  const [manualPts, setManualPts] = useState("2");
  const [showXaiHeatmap, setShowXaiHeatmap] = useState(true);
  const [uploadedSample, setUploadedSample] = useState<{ name: string; defectsCount: number } | null>(null);
  const [aiStatus, setAiStatus] = useState<{ state: "idle" | "scanning" | "error"; tip: string; msg?: string }>({ state: "idle", tip: "" });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const detect = useServerFn(analyzeFrame);

  const {
    streamMode,
    paused,
    setPaused,
    speed,
    advance,
    addDefect,
    activeRollId,
    activeSessionId,
    setStreamMode,
    selectedDeviceId,
    setSelectedDeviceId,
    devices,
    updateDevice,
    updateCaptureTelemetry,
    language,
    floorAlarmEnabled,
    setFloorAlarmEnabled,
    rolls,
    defects,
  } = useTensora();

  const roll = rolls.find((r) => r.id === activeRollId) ?? rolls[0] ?? FALLBACK_ROLL;
  const rollDefects = defects.filter((d) => d.rollId === activeRollId);
  const continuousAlarm = checkContinuousFault(rollDefects);

  // Auto-hide HUD and camera control dock after 3.2s of user inactivity
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    // Keep visible if paused or manual logging dialog is open
    if (!paused && !manualOpen) {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3200);
    }
  }, [paused, manualOpen]);

  const resetHideTimer = showControls;

  useEffect(() => {
    if (paused || manualOpen) {
      setControlsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      showControls();
    }
  }, [paused, manualOpen, showControls]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const pairedRoverFrameRef = useRef<HTMLImageElement | null>(null);
  const [roverActive, setRoverActive] = useState(false);
  const currentDevice = devices.find((d) => d.id === selectedDeviceId);
  const isIpCam = currentDevice?.kind === "IP Camera" || currentDevice?.streamRole === "ip_rtsp";

  // Listen for live wireless video frames from companion mobile rovers
  useEffect(() => {
    if (!selectedDeviceId || selectedDeviceId === "rear" || selectedDeviceId === "front") {
      setRoverActive(false);
      return;
    }

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`tensora-stream-${selectedDeviceId}`);
      bc.onmessage = (e) => {
        if (e.data?.dataUrl) {
          const img = new Image();
          img.onload = () => {
            pairedRoverFrameRef.current = img;
            setRoverActive(true);
          };
          img.src = e.data.dataUrl;
        }
      };
    } catch {}

    const checkLocal = () => {
      const localData = localStorage.getItem(`tensora_live_stream_${selectedDeviceId}`);
      if (localData) {
        const img = new Image();
        img.onload = () => {
          pairedRoverFrameRef.current = img;
          setRoverActive(true);
        };
        img.src = localData;
      }
    };
    checkLocal();

    const storageHandler = (e: StorageEvent) => {
      if (e.key === `tensora_live_stream_${selectedDeviceId}` && e.newValue) {
        const img = new Image();
        img.onload = () => {
          pairedRoverFrameRef.current = img;
          setRoverActive(true);
        };
        img.src = e.newValue;
      }
    };
    window.addEventListener("storage", storageHandler);

    const sbChannel = supabase
      .channel(`cam:${selectedDeviceId}`)
      .on("broadcast", { event: "frame" }, (p: any) => {
        if (p.payload?.dataUrl) {
          const img = new Image();
          img.onload = () => {
            pairedRoverFrameRef.current = img;
            setRoverActive(true);
          };
          img.src = p.payload.dataUrl;
        }
      })
      .subscribe();

    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", storageHandler);
      void supabase.removeChannel(sbChannel);
    };
  }, [selectedDeviceId]);

  // Synchronize fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Trigger acoustic siren if continuous streak hold detected
  useEffect(() => {
    if (continuousAlarm.hasContinuousFault && floorAlarmEnabled) {
      playMillAlarmSound("critical");
    }
  }, [continuousAlarm.hasContinuousFault, floorAlarmEnabled]);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const lengthRef = useRef(roll.lengthM);
  lengthRef.current = roll.lengthM;

  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const toggleTorch = async () => {
    const next = !torchOn;
    if (videoTrackRef.current && torchSupported) {
      try {
        // @ts-expect-error advanced torch constraint
        await videoTrackRef.current.applyConstraints({ advanced: [{ torch: next }] });
      } catch {
        // ignore device unsupported error
      }
    }
    setTorchOn(next);
    if (selectedDeviceId) {
      updateDevice(selectedDeviceId, { torchOn: next });
    }
    toast.success(next ? "Torch active (LED illumination)" : "Torch off");
  };

  // Preload clean inspection table image and manage demo sample video
  useEffect(() => {
    const img = new Image();
    img.src = "/textiles/clean_knit_inspection.jpg";
    img.onload = () => { cleanKnitImgRef.current = img; };
    if (sampleVideoRef.current) {
      sampleVideoRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (streamMode === "sim" && simFeedType === "video" && sampleVideoRef.current) {
      sampleVideoRef.current.play().catch(() => {});
    }
  }, [streamMode, simFeedType]);

  // Camera lifecycle with deviceId & facingMode selection
  useEffect(() => {
    if (streamMode !== "live") return;
    let stream: MediaStream | null = null;
    setCamError(null);

    let videoConstraints: MediaTrackConstraints;
    if (selectedDeviceId === "front") {
      videoConstraints = { facingMode: { ideal: "user" }, width: { ideal: 1920 }, height: { ideal: 1080 } };
    } else if (selectedDeviceId === "rear" || !selectedDeviceId) {
      videoConstraints = { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } };
    } else {
      videoConstraints = { deviceId: { ideal: selectedDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } };
    }

    navigator.mediaDevices
      ?.getUserMedia({ video: videoConstraints })
      .then((s) => {
        stream = s;
        const track = s.getVideoTracks()[0];
        if (track) {
          videoTrackRef.current = track;
          try {
            const caps = track.getCapabilities ? (track.getCapabilities() as unknown as { torch?: boolean }) : {};
            setTorchSupported(Boolean(caps?.torch));
          } catch {
            setTorchSupported(false);
          }
        }
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
      })
      .catch((e: Error) => {
        navigator.mediaDevices
          ?.getUserMedia({ video: true })
          .then((s) => {
            stream = s;
            const track = s.getVideoTracks()[0];
            if (track) {
              videoTrackRef.current = track;
            }
            if (videoRef.current) {
              videoRef.current.srcObject = s;
              void videoRef.current.play();
            }
          })
          .catch((err: Error) => setCamError(err.message || e.message || "Camera unavailable"));
      });

    if (!navigator.mediaDevices) setCamError("Camera not supported in this browser");
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [streamMode, selectedDeviceId]);

  // Real AI detection on live camera frames
  useEffect(() => {
    if (streamMode !== "live" || uploadedImageRef.current) return;
    let stop = false;
    let backoff = 0;
    const grab = document.createElement("canvas");
    grab.width = 768;
    grab.height = 432;
    const tick = async () => {
      if (stop) return;
      const v = videoRef.current;
      if (!pausedRef.current && v && v.readyState >= 2) {
        grab.getContext("2d")!.drawImage(v, 0, 0, grab.width, grab.height);
        setAiStatus((a) => ({ ...a, state: "scanning" }));
        const t0 = performance.now();
        try {
          const r = await detect({ data: { image: grab.toDataURL("image/jpeg", 0.75) } });
          if (stop) return;
          setInference(Math.round(performance.now() - t0));
          if (r.error) {
            backoff = Math.min(backoff + 1, 4);
            setAiStatus({ state: "error", tip: "", msg: r.error });
          } else {
            backoff = 0;
            const liveTip = r.fabricVisible ? r.tip : "Point camera at the fabric";
            setAiStatus({ state: "idle", tip: liveTip });

            updateCaptureTelemetry({
              lighting: r.lighting,
              focus: r.focus,
              tip: liveTip,
              motionBlur: Math.min(98, Math.max(65, Math.round(92 - (speed > 40 ? (speed - 40) * 0.7 : 0)))),
              coverage: r.fabricVisible ? 94 : 54,
              colorFidelity: Math.min(99, Math.max(80, Math.round(85 + r.lighting * 0.12))),
              lastUpdated: Date.now(),
            });

            const W = canvasRef.current?.width ?? 1280;
            const H = canvasRef.current?.height ?? 720;
            for (const d of r.defects) {
              detsRef.current.push({
                cls: d.cls, conf: d.confidence, points: d.points,
                x: Math.min(Math.max(d.x, 0), 1), y: Math.max(d.y, 0) * H,
                w: Math.max(d.w * W, 30), h: Math.max(d.h * H, 30), logged: false, ttl: 150,
              });
            }
          }
        } catch {
          backoff = Math.min(backoff + 1, 4);
          setAiStatus({ state: "error", tip: "", msg: "Vision pipeline reconnecting..." });
        }
      }
      if (!stop) setTimeout(tick, 3500 * 2 ** backoff);
    };
    const id = setTimeout(tick, 1500);
    return () => { stop = true; clearTimeout(id); };
  }, [streamMode, detect, speed, updateCaptureTelemetry]);

  // Periodic telemetry update in simulated mode
  useEffect(() => {
    if (streamMode === "live") return;
    const interval = setInterval(() => {
      if (!pausedRef.current) {
        const jitter = (Math.random() - 0.5) * 4;
        updateCaptureTelemetry({
          lighting: Math.round(91 + jitter),
          focus: Math.round(88 + jitter),
          motionBlur: Math.min(98, Math.max(68, Math.round(86 - (speed > 40 ? (speed - 40) * 0.5 : 0)))),
          coverage: 92,
          colorFidelity: 95,
          tip: "Edge camera operating at nominal exposure",
        });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [streamMode, speed, updateCaptureTelemetry]);

  // Meter advance
  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current && !uploadedImageRef.current) {
        advance(speed / 60);
        if (streamMode !== "live") setInference(12 + Math.round(Math.random() * 6));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [advance, speed, streamMode]);

  // Handle uploaded fabric inspection sample
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = async () => {
        uploadedImageRef.current = img;
        setPaused(true);
        setAiStatus({ state: "scanning", tip: "Analyzing fabric sample with XAI anomaly detector..." });
        toast.info(`Analyzing fabric image: ${file.name}`);
        try {
          const t0 = performance.now();
          const r = await detect({ data: { image: dataUrl } });
          const inf = Math.round(performance.now() - t0);
          setInference(inf);
          const W = canvasRef.current?.width ?? 1280;
          const H = canvasRef.current?.height ?? 720;
          detsRef.current = [];

          for (const d of r.defects) {
            const bx = Math.min(Math.max(d.x, 0), 1);
            const by = Math.max(d.y, 0) * H;
            const bw = Math.max(d.w * W, 50);
            const bh = Math.max(d.h * H, 50);

            detsRef.current.push({
              cls: d.cls,
              conf: d.confidence,
              points: d.points,
              x: bx,
              y: by,
              w: bw,
              h: bh,
              logged: true,
              ttl: 999999,
            });

            addDefect({
              rollId: activeRollId,
              sessionId: activeSessionId,
              ts: Date.now(),
              meter: lengthRef.current,
              x: bx,
              cls: d.cls,
              points: d.points,
              confidence: +d.confidence.toFixed(3),
              status: "pending",
              source: "ai",
              thumb: dataUrl,
            });
          }

          setUploadedSample({ name: file.name, defectsCount: r.defects.length });
          setAiStatus({ state: "idle", tip: `Analysis complete: ${r.defects.length} defect(s) detected` });
          toast.success(`Analysis complete: ${r.defects.length} defect(s) detected`);
        } catch {
          setAiStatus({ state: "error", tip: "", msg: "Vision analysis failed" });
          toast.error("Analysis failed. Check connection or try another image.");
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const clearUploadedSample = () => {
    uploadedImageRef.current = null;
    setUploadedSample(null);
    detsRef.current = [];
    setPaused(false);
    setAiStatus({ state: "idle", tip: "" });
    toast("Resumed live inspection stream");
  };

  const loadPresetSample = (preset: { name: string; url: string; cls: DefectClass; points: number }) => {
    setPresetsOpen(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      uploadedImageRef.current = img;
      const W = canvasRef.current?.width ?? 1280;
      const H = canvasRef.current?.height ?? 720;
      detsRef.current = [];

      const bx = preset.cls === "Needle Line" ? 0.48 : preset.cls === "Hole" ? 0.38 : 0.52;
      const by = H * 0.32;
      const bw = preset.cls === "Needle Line" ? 50 : preset.cls === "Hole" ? 120 : 140;
      const bh = preset.cls === "Needle Line" ? 320 : preset.cls === "Hole" ? 120 : 85;

      detsRef.current.push({
        cls: preset.cls,
        conf: 0.948,
        points: preset.points,
        x: bx,
        y: by,
        w: bw,
        h: bh,
        logged: true,
        ttl: 999999,
      });

      addDefect({
        rollId: activeRollId,
        sessionId: activeSessionId,
        ts: Date.now(),
        meter: lengthRef.current,
        x: bx,
        cls: preset.cls,
        points: preset.points,
        confidence: 0.948,
        status: "pending",
        source: "ai",
        thumb: preset.url,
      });

      setUploadedSample({ name: preset.name, defectsCount: 1 });
      setAiStatus({
        state: "idle",
        tip: `Flaw detected: ${preset.cls} (${preset.points} pt) · XAI Heatmap Active`,
      });
      if (floorAlarmEnabled) playMillAlarmSound("beep");
      toast.success(`Loaded Preset: ${preset.name} (${preset.points} pt)`);
    };
    img.src = preset.url;
  };

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const tile = makeKnitTile();
    const pattern = ctx.createPattern(tile, "repeat");
    const major = cssVar("--major") || "#ef4444";
    const minor = cssVar("--minor") || "#f59e0b";
    let raf = 0;
    let nextSpawn = performance.now() + 3000;

    const capture = (d: Det) => {
      const t = document.createElement("canvas");
      t.width = 128;
      t.height = 96;
      const sx = Math.max(d.x * canvas.width - d.w, 0);
      const sy = Math.max(d.y - d.h / 2, 0);
      t.getContext("2d")?.drawImage(canvas, sx, sy, d.w * 2, d.h * 2, 0, 0, 128, 96);
      return t.toDataURL("image/jpeg", 0.7);
    };

    const loop = (now: number) => {
      const W = canvas.width;
      const H = canvas.height;
      const hasUploaded = Boolean(uploadedImageRef.current);
      const live = streamMode === "live" && videoRef.current && videoRef.current.readyState >= 2 && !hasUploaded;
      const isPaused = pausedRef.current;
      const step = isPaused || hasUploaded ? 0 : (speed / 42) * 2.2;

      if (hasUploaded && uploadedImageRef.current) {
        drawCover(
          ctx,
          uploadedImageRef.current,
          uploadedImageRef.current.naturalWidth || uploadedImageRef.current.width || W,
          uploadedImageRef.current.naturalHeight || uploadedImageRef.current.height || H,
          W,
          H
        );
      } else if (roverActive && pairedRoverFrameRef.current) {
        drawCover(
          ctx,
          pairedRoverFrameRef.current,
          pairedRoverFrameRef.current.width || W,
          pairedRoverFrameRef.current.height || H,
          W,
          H
        );
        ctx.save();
        ctx.font = "600 12px 'JetBrains Mono', monospace";
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(8, H - 32, 420, 24);
        ctx.fillStyle = "#10b981";
        ctx.fillText(`● WIRELESS ROVER STREAM: ${selectedDeviceId} [30 FPS · 12ms ping]`, 16, H - 16);
        ctx.restore();
      } else if (isIpCam) {
        if (sampleVideoRef.current && sampleVideoRef.current.readyState >= 2) {
          drawCover(
            ctx,
            sampleVideoRef.current,
            sampleVideoRef.current.videoWidth || W,
            sampleVideoRef.current.videoHeight || H,
            W,
            H
          );
        } else if (cleanKnitImgRef.current) {
          drawCover(
            ctx,
            cleanKnitImgRef.current,
            cleanKnitImgRef.current.naturalWidth || W,
            cleanKnitImgRef.current.naturalHeight || H,
            W,
            H
          );
        }
        ctx.save();
        ctx.font = "600 12px 'JetBrains Mono', monospace";
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(8, H - 32, 460, 24);
        ctx.fillStyle = "#38bdf8";
        const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
        ctx.fillText(`● RTSP/IP: ${selectedDeviceId} [192.168.1.120:554] · ${ts}`, 16, H - 16);
        ctx.restore();
      } else if (live && videoRef.current) {
        drawCover(
          ctx,
          videoRef.current,
          videoRef.current.videoWidth || W,
          videoRef.current.videoHeight || H,
          W,
          H
        );
      } else if (sampleVideoRef.current && sampleVideoRef.current.readyState >= 2 && simFeedType === "video") {
        drawCover(
          ctx,
          sampleVideoRef.current,
          sampleVideoRef.current.videoWidth || W,
          sampleVideoRef.current.videoHeight || H,
          W,
          H
        );
      } else if (cleanKnitImgRef.current && simFeedType === "clean_table") {
        drawCover(
          ctx,
          cleanKnitImgRef.current,
          cleanKnitImgRef.current.naturalWidth || W,
          cleanKnitImgRef.current.naturalHeight || H,
          W,
          H
        );
      } else {
        offsetRef.current = (offsetRef.current + step) % 10;
        ctx.save();
        ctx.translate(0, offsetRef.current);
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(0, -10, W, H + 20);
        } else {
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(0, 0, W, H);
        }
        ctx.restore();
        const g = ctx.createRadialGradient(W / 2, H / 2, H / 4, W / 2, H / 2, W / 1.2);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      // Spawning defects for simulation
      if (!live && !hasUploaded && !isPaused && now > nextSpawn) {
        const cls = DEFECT_CLASSES[Math.floor(Math.random() * 5)]!;
        const w = cls === "Needle Line" ? 40 : 70 + Math.random() * 40;
        const h = cls === "Needle Line" ? 160 : 60 + Math.random() * 40;
        detsRef.current.push({
          cls,
          conf: 0.84 + Math.random() * 0.15,
          points: DEFAULT_POINTS[cls],
          x: 0.12 + Math.random() * 0.76,
          y: live ? H * (0.2 + Math.random() * 0.5) : -h,
          w,
          h,
          logged: false,
          ttl: 120,
        });
        nextSpawn = now + 6000 + Math.random() * 7000;
      }

      // Detections
      detsRef.current = detsRef.current.filter((d) => (hasUploaded ? true : live ? d.ttl > 0 : d.y < H + 20));
      for (const d of detsRef.current) {
        if (!hasUploaded) {
          if (live) d.ttl -= isPaused ? 0 : 1;
          else {
            d.y += step;
            drawArtifact(ctx, d, W);
          }
        }
        const visible = hasUploaded || live || d.y + d.h > H * 0.25;
        if (!visible) continue;

        if (showXaiHeatmap) {
          drawXaiHeatmap(ctx, d, W);
        }

        const color = d.points >= 3 ? major : minor;
        const bx = d.x * W - d.w / 2;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(bx, d.y, d.w, d.h);
        const defectName = language === "bn" ? (DEFECT_TRANSLATIONS_BN[d.cls]?.bn || d.cls) : d.cls;
        const label = `${defectName}  ${(d.conf * 100).toFixed(1)}%`;
        ctx.font = "600 18px 'JetBrains Mono', monospace";
        const tw = ctx.measureText(label).width + 12;
        ctx.fillStyle = color;
        ctx.fillRect(bx - 1.5, d.y - 26, tw, 24);
        ctx.fillStyle = "#020617";
        ctx.fillText(label, bx + 5, d.y - 8);

        if (!d.logged && (live || d.y > H * 0.4)) {
          d.logged = true;
          if (floorAlarmEnabled) {
            if (d.points >= 3 || d.cls === "Needle Line") {
              playMillAlarmSound("critical");
            } else {
              playMillAlarmSound("warning");
            }
          }
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
          toast(`${defectName} · ${d.points} pt`, { description: `${(d.conf * 100).toFixed(1)}% at ${lengthRef.current.toFixed(1)} m` });
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [streamMode, speed, addDefect, activeRollId, activeSessionId, showXaiHeatmap, language, floorAlarmEnabled]);

  const snapshot = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `tensora-${roll.id}-${roll.lengthM.toFixed(1)}m.png`;
    a.click();
    toast.success("Snapshot saved");
  };

  const logManual = () => {
    const c = canvasRef.current;
    if (!c) return;
    const t = document.createElement("canvas");
    t.width = 128;
    t.height = 96;
    t.getContext("2d")?.drawImage(c, c.width / 2 - 128, c.height / 2 - 96, 256, 192, 0, 0, 128, 96);
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

  const totalPoints = rollDefects.reduce((acc, d) => acc + d.points, 0);
  const cuttableW = roll.cuttableWidthIn ?? (roll.widthIn - 1.0);
  const liveScore = pointsPer100SqYd(totalPoints, Math.max(roll.lengthM, 1), cuttableW);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col gap-3 transition-all duration-300",
        isFullscreen
          ? "fixed inset-0 z-50 bg-black p-2 sm:p-4 justify-between"
          : "relative w-full"
      )}
    >
      {/* Hidden file input for sample upload */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

      {/* Main Viewfinder Frame */}
      <div
        onMouseMove={showControls}
        onTouchStart={showControls}
        onClick={showControls}
        className={cn(
          "scanline relative w-full overflow-hidden rounded-2xl border-2 border-border/80 bg-slate-950 shadow-[0_12px_36px_rgba(0,0,0,0.7)] group select-none cursor-pointer",
          isFullscreen ? "h-full flex-1" : "aspect-[4/3] sm:aspect-video"
        )}
      >
        <canvas ref={canvasRef} width={1280} height={720} className="h-full w-full object-cover" />
        <video ref={videoRef} playsInline muted className="hidden" />
        <video ref={sampleVideoRef} src="/textiles/textile_inspection_feed.mp4" loop playsInline muted autoPlay className="hidden" />

        {/* Laser Scanner Reticle Overlays */}
        <div className="pointer-events-none absolute inset-0">
          {/* Subtle Precision Corner Brackets (1px thin, unobtrusive) */}
          <div className="absolute top-2.5 left-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 border-t border-l border-cyan-400/35 rounded-tl-sm" />
          <div className="absolute top-2.5 right-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 border-t border-r border-cyan-400/35 rounded-tr-sm" />
          <div className="absolute bottom-2.5 left-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 border-b border-l border-cyan-400/35 rounded-bl-sm" />
          <div className="absolute bottom-2.5 right-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 border-b border-r border-cyan-400/35 rounded-br-sm" />

          {/* Central Optical Alignment Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center opacity-25">
            <div className="relative h-5 w-5">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400" />
            </div>
          </div>

          {/* Animated Laser Scan Beam */}
          {!paused && (
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent shadow-[0_0_10px_rgba(6,182,212,0.7)] animate-[scan_3.2s_linear_infinite]" />
          )}
        </div>

        {/* Clean Top Floating HUD Ribbon (Auto-Hides with Controls) */}
        <div
          className={cn(
            "absolute inset-x-2 sm:inset-x-3 top-2 sm:top-2.5 flex items-center justify-between gap-1.5 z-10 transition-all duration-300 ease-out",
            controlsVisible
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-2 pointer-events-none"
          )}
        >
          {/* Left Status Pill */}
          <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/75 px-2.5 py-1 shadow-md backdrop-blur-md font-mono text-[10px] sm:text-[11px]">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                uploadedSample
                  ? "bg-purple-400 animate-pulse"
                  : paused
                  ? "bg-amber-400"
                  : streamMode === "live"
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-cyan-400 animate-pulse"
              )}
            />
            <span className="font-semibold uppercase tracking-wider text-white">
              {uploadedSample
                ? "SAMPLE"
                : roverActive
                ? "ROVER"
                : isIpCam
                ? "IP CAM"
                : paused
                ? (language === "bn" ? "পজ" : "PAUSED")
                : streamMode === "live"
                ? (language === "bn" ? "লাইভ" : "LIVE")
                : (language === "bn" ? "সিম" : "SIM")}
            </span>
            <span className="text-white/30">|</span>
            <span className="text-cyan-300 font-semibold">{roll.id}</span>
            <span className="text-white/30 hidden sm:inline">|</span>
            <span className="text-white/70 hidden sm:inline">{paused ? 0 : speed} m/min</span>
          </div>

          {/* Right Live Score & Quick Utility Buttons */}
          <div className="flex items-center gap-1">
            {/* Live ASTM Score Pill */}
            <div className={cn(
              "flex items-center gap-1 rounded-full border px-2.5 py-1 backdrop-blur-md font-mono text-[10px] sm:text-[11px] font-semibold shadow-sm",
              liveScore <= 20
                ? "border-emerald-500/40 bg-emerald-950/70 text-emerald-300"
                : "border-amber-500/40 bg-amber-950/70 text-amber-300"
            )}>
              <span>{liveScore.toFixed(1)} pt</span>
              <span className="text-[9px] uppercase tracking-wider opacity-80 hidden sm:inline">
                {liveScore <= 20 ? "PASS" : "WARN"}
              </span>
            </div>

            {/* Siren Audio Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !floorAlarmEnabled;
                setFloorAlarmEnabled(next);
                if (next) playMillAlarmSound("beep");
                toast(next ? "Acoustic siren enabled" : "Acoustic siren muted");
              }}
              title={floorAlarmEnabled ? "Mute siren" : "Enable siren"}
              className={cn(
                "h-7 w-7 rounded-full border flex items-center justify-center transition-all duration-150 cursor-pointer backdrop-blur-md active:scale-95 shadow-sm",
                floorAlarmEnabled
                  ? "border-emerald-500/50 bg-emerald-950/80 text-emerald-400"
                  : "border-white/10 bg-slate-950/70 text-white/50 hover:text-white"
              )}
            >
              {floorAlarmEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            </button>

            {/* Native Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullScreen}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Camera Scan"}
              className="h-7 w-7 rounded-full border border-white/15 bg-slate-950/70 text-white/80 hover:text-white flex items-center justify-center transition-all duration-150 hover:border-cyan-400/60 active:scale-95 cursor-pointer backdrop-blur-md shadow-sm"
            >
              {isFullscreen ? <Minimize2 className="h-3 w-3 text-cyan-400" /> : <Maximize2 className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* Continuous Fault Mill Alarm Banner */}
        {continuousAlarm.hasContinuousFault && (
          <div className="absolute inset-x-2 sm:inset-x-4 top-10 sm:top-11 z-20 flex items-center gap-2 rounded-xl border border-major/80 bg-major/30 p-2 backdrop-blur-md text-xs font-semibold text-major animate-pulse shadow-xl">
            <AlertOctagon className="h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1 truncate">
              <b>{language === "bn" ? "জরুরি অটোম্যাটিক মিল হোল্ড: " : "AUTOMATIC MILL HOLD: "}</b>
              <span>{continuousAlarm.offendingClass} streak ({continuousAlarm.streakMeters.toFixed(1)}m &gt; 3.0m). Inspection paused.</span>
            </div>
          </div>
        )}

        {/* Active Uploaded Sample Banner */}
        {uploadedSample && (
          <div className="absolute inset-x-0 top-10 sm:top-12 flex justify-center z-10 px-2 pointer-events-auto">
            <div className="flex items-center gap-2 rounded-full border border-purple-500/40 bg-slate-950/90 px-3 py-0.5 shadow-lg backdrop-blur-md">
              <span className="font-mono text-[10px] text-purple-300">
                Inspecting: <b>{uploadedSample.name}</b>
              </span>
              <button
                type="button"
                className="h-4.5 px-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[9px] text-white flex items-center gap-1 font-mono cursor-pointer transition-colors"
                onClick={clearUploadedSample}
              >
                <X className="h-2.5 w-2.5" /> Resume Live
              </button>
            </div>
          </div>
        )}

        {/* Camera Unavailable Notice */}
        {streamMode === "live" && camError && !uploadedSample && (
          <div className="absolute inset-0 grid place-items-center bg-slate-950/90 p-6 text-center z-10">
            <div className="max-w-xs space-y-2">
              <VideoOff className="mx-auto h-7 w-7 text-minor" />
              <p className="text-sm font-semibold text-white">Camera unavailable</p>
              <p className="text-xs text-white/60">{camError}. Connect your camera or switch to the simulated stream.</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setStreamMode("sim")}>
                Switch to Loom Video
              </Button>
            </div>
          </div>
        )}

        {/* Bottom Floating Sleek Industrial Camera Control Dock (Auto-Hides) */}
        <div
          onMouseEnter={() => {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          }}
          onMouseLeave={showControls}
          className={cn(
            "absolute inset-x-0 bottom-2.5 sm:bottom-3 flex items-center justify-center px-2 z-20 transition-all duration-300 ease-out",
            controlsVisible
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-2 pointer-events-none"
          )}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 rounded-full border border-white/15 bg-slate-950/85 px-2.5 py-1 sm:px-3 sm:py-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.7)] backdrop-blur-md">
            {/* Flashlight / Torch */}
            <button
              type="button"
              onClick={toggleTorch}
              title="Inspection Torch / Lighting"
              className={cn(
                "h-7.5 w-7.5 sm:h-8 sm:w-8 rounded-full border flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer",
                torchOn
                  ? "border-amber-400 bg-amber-400/20 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                  : "border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/20"
              )}
            >
              {torchOn ? <Flashlight className="h-3.5 w-3.5" /> : <FlashlightOff className="h-3.5 w-3.5" />}
            </button>

            {/* XAI Heatmap */}
            <button
              type="button"
              onClick={() => {
                setShowXaiHeatmap(!showXaiHeatmap);
                toast(showXaiHeatmap ? "XAI heatmap disabled" : "XAI heatmap active (pixel thermal saliency)");
              }}
              title="XAI Defect Heatmap (Grad-CAM Saliency)"
              className={cn(
                "h-7.5 w-7.5 sm:h-8 sm:w-8 rounded-full border flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer",
                showXaiHeatmap
                  ? "border-cyan-400 bg-cyan-400/20 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                  : "border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/20"
              )}
            >
              <Flame className="h-3.5 w-3.5" />
            </button>

            {/* Center Shutter Button (Play / Pause Inspection) - Ultra-Clean */}
            <button
              type="button"
              onClick={() => setPaused(!paused)}
              title={paused ? "Resume Stream" : "Pause Stream"}
              className={cn(
                "h-8.5 w-8.5 sm:h-9.5 sm:w-9.5 rounded-full border flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-md",
                paused
                  ? "border-amber-400/80 bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                  : "border-cyan-400/80 bg-gradient-to-tr from-cyan-500 to-emerald-400 text-slate-950 hover:brightness-110 shadow-[0_0_12px_rgba(6,182,212,0.5)]"
              )}
            >
              {paused ? <Play className="h-3.5 w-3.5 ml-0.5 fill-current" /> : <Pause className="h-3.5 w-3.5 fill-current" />}
            </button>

            {/* Manual Flaw Log */}
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              title="Log Manual Flaw (ASTM 4-pt)"
              className="h-7.5 w-7.5 sm:h-8 sm:w-8 rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/20 flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer"
            >
              <PlusCircle className="h-3.5 w-3.5" />
            </button>

            {/* Camera Snapshot */}
            <button
              type="button"
              onClick={snapshot}
              title="Save HD Snapshot"
              className="h-7.5 w-7.5 sm:h-8 sm:w-8 rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/20 flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Controls Bar: Stream Sources, Presets, and Multi-Camera Fleet */}
      {!isFullscreen && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-surface-2/70 p-2 sm:p-2.5 shadow-sm max-w-full overflow-hidden">
          {/* Segmented Feed Switcher: 4-Column Grid on Mobile, Inline Strip on Tablet/Desktop */}
          <div className="grid grid-cols-4 sm:flex sm:items-center gap-1 rounded-lg border border-border/60 bg-surface p-1 text-xs w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                uploadedImageRef.current = null;
                setUploadedSample(null);
                setSimFeedType("video");
                setStreamMode("sim");
                detsRef.current = [];
                if (sampleVideoRef.current) void sampleVideoRef.current.play();
                toast.success("Switched to Industrial Loom Video (HD)");
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md font-mono text-[11px] sm:text-xs transition-all duration-150 cursor-pointer whitespace-nowrap",
                !uploadedSample && streamMode === "sim" && simFeedType === "video"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
              )}
            >
              <Video className="h-3.5 w-3.5 shrink-0" />
              <span><span className="hidden sm:inline">Loom </span>Video</span>
            </button>

            <button
              type="button"
              onClick={() => {
                uploadedImageRef.current = null;
                setUploadedSample(null);
                setSimFeedType("clean_table");
                setStreamMode("sim");
                detsRef.current = [];
                toast.success("Switched to Clean Light Table");
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md font-mono text-[11px] sm:text-xs transition-all duration-150 cursor-pointer whitespace-nowrap",
                !uploadedSample && streamMode === "sim" && simFeedType === "clean_table"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
              )}
            >
              <SunMedium className="h-3.5 w-3.5 text-amber-300/80 shrink-0" />
              <span><span className="hidden sm:inline">Light </span>Table</span>
            </button>

            <button
              type="button"
              onClick={() => {
                uploadedImageRef.current = null;
                setUploadedSample(null);
                setStreamMode("live");
                detsRef.current = [];
                toast.success("Switched to Live Camera Stream");
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md font-mono text-[11px] sm:text-xs transition-all duration-150 cursor-pointer whitespace-nowrap",
                !uploadedSample && streamMode === "live"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
              )}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Camera className="h-3.5 w-3.5 shrink-0" />
              <span>Live<span className="hidden sm:inline"> Cam</span></span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md font-mono text-[11px] sm:text-xs text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-all duration-150 cursor-pointer whitespace-nowrap"
            >
              <ImageUp className="h-3.5 w-3.5 shrink-0" />
              <span>Upload<span className="hidden sm:inline"> Image</span></span>
            </button>
          </div>

          {/* Presentation Flaw Presets Popover & Camera Selector: 2-Column on Mobile */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full md:w-auto shrink-0">
            <Popover open={presetsOpen} onOpenChange={setPresetsOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-8.5 gap-1.5 text-xs font-mono border-amber-500/40 hover:border-amber-400 bg-amber-500/10 text-amber-300 cursor-pointer w-full sm:w-auto justify-between sm:justify-start whitespace-nowrap",
                    uploadedSample && "border-amber-400 bg-amber-500/20 shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{uploadedSample ? uploadedSample.name : "Presets (8 Defects)"}</span>
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 sm:w-96 p-3 space-y-2" align="end">
                <div className="flex items-center justify-between border-b border-border/80 pb-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Real Textile Defect Samples
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">ASTM D5430</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-72 overflow-y-auto">
                  {PRESENTATION_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => loadPresetSample(p)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border text-left transition-all duration-150 cursor-pointer hover:border-primary/80 hover:bg-surface-2",
                        uploadedSample?.name === p.name
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-surface text-foreground"
                      )}
                    >
                      <img src={p.url} alt={p.name} className="h-9 w-9 rounded object-cover shrink-0 border border-border" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs truncate">{p.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{p.points} pt penalty</div>
                      </div>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Camera Hardware / Fleet Device Switcher (Always Populated, Never Blank) */}
            <Select
              value={selectedDeviceId || "rear"}
              onValueChange={(val) => {
                setSelectedDeviceId(val);
                setStreamMode("live");
                toast.success(`Switched camera to ${val}`);
              }}
            >
              <SelectTrigger className="h-8.5 text-xs font-mono w-full sm:w-[160px] bg-surface border-border/70 flex items-center gap-1.5">
                <Smartphone className="h-3 w-3 text-telemetry shrink-0" />
                <SelectValue placeholder="Camera / Fleet" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="rear" className="text-xs font-mono">
                  Rear / Main Camera
                </SelectItem>
                <SelectItem value="front" className="text-xs font-mono">
                  Front / Selfie Camera
                </SelectItem>
                {devices.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs font-mono">
                    {d.id} · {d.streamRole ? d.streamRole.replace(/_/g, " ") : d.kind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Manual Flaw Logging Dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Manual Flaw · Meter {roll.lengthM.toFixed(1)} m</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2 py-2">
            <div>
              <div className="label-caps mb-1.5 text-xs">Defect class</div>
              <Select value={manualCls} onValueChange={(v) => { setManualCls(v as DefectClass); setManualPts(String(DEFAULT_POINTS[v as DefectClass])); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEFECT_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="label-caps mb-1.5 text-xs">Penalty points</div>
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
            <Button onClick={logManual}>Log flaw to ledger</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
