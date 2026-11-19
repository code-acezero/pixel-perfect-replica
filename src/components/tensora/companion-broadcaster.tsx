import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Camera,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  Radio,
  RotateCw,
  Sliders,
  Sparkles,
  StopCircle,
  VideoOff,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface CompanionBroadcasterProps {
  pairId: string;
  pin?: string;
  onExit: () => void;
}

export function CompanionBroadcaster({ pairId, pin, onExit }: CompanionBroadcasterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [fps, setFps] = useState(30);
  const [frameCount, setFrameCount] = useState(0);
  const [streaming, setStreaming] = useState(true);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  // Initialize camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    setCamError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCamError("Camera API is not available on this browser or requires HTTPS.");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
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
            if (videoRef.current) {
              videoRef.current.srcObject = s;
              void videoRef.current.play();
            }
          })
          .catch((err: Error) => setCamError(err.message || e.message || "Could not access mobile camera"));
      });

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]);

  // Frame broadcasting loop (BroadcastChannel + LocalStorage + Supabase Realtime)
  useEffect(() => {
    if (!streaming || camError) return;

    const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`tensora-stream-${pairId}`) : null;
    const sbChannel = supabase.channel(`cam:${pairId}`);
    sbChannel.subscribe();

    const grabCanvas = document.createElement("canvas");
    grabCanvas.width = 640;
    grabCanvas.height = 360;
    const ctx = grabCanvas.getContext("2d");

    let lastSent = 0;
    let framesInSecond = 0;
    let lastFpsCalc = Date.now();

    const interval = setInterval(() => {
      const v = videoRef.current;
      if (v && v.readyState >= 2 && ctx) {
        ctx.drawImage(v, 0, 0, grabCanvas.width, grabCanvas.height);
        const dataUrl = grabCanvas.toDataURL("image/jpeg", 0.65);

        // 1. BroadcastChannel (zero-latency same-browser / cross-tab)
        if (bc) {
          bc.postMessage({ type: "frame", pairId, dataUrl, ts: Date.now() });
        }

        // 2. LocalStorage backup
        try {
          localStorage.setItem(`tensora_live_stream_${pairId}`, dataUrl);
          localStorage.setItem(`tensora_live_stream_ts_${pairId}`, String(Date.now()));
        } catch {}

        // 3. Supabase Realtime (cross-device over network)
        void sbChannel.send({
          type: "broadcast",
          event: "frame",
          payload: { pairId, dataUrl, ts: Date.now() },
        });

        setFrameCount((c) => c + 1);
        framesInSecond++;

        const now = Date.now();
        if (now - lastFpsCalc >= 1000) {
          setFps(framesInSecond);
          framesInSecond = 0;
          lastFpsCalc = now;
        }
      }
    }, 100); // 10 FPS continuous live wireless transmission

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
      void supabase.removeChannel(sbChannel);
    };
  }, [streaming, pairId, camError]);

  const toggleTorch = async () => {
    const next = !torchOn;
    if (videoTrackRef.current && torchSupported) {
      try {
        // @ts-expect-error advanced torch constraint
        await videoTrackRef.current.applyConstraints({ advanced: [{ torch: next }] });
      } catch {}
    }
    setTorchOn(next);
    toast.success(next ? "Inspection torch activated" : "Torch turned off");
  };

  const flipCamera = () => {
    setFacingMode((m) => (m === "environment" ? "user" : "environment"));
    toast("Switched camera lens");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black text-white select-none">
      {/* Video Element */}
      <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-cover" />

      {/* Optical Reticle overlay */}
      <div className="pointer-events-none absolute inset-0 z-10 p-4">
        <div className="h-full w-full relative border border-white/20 rounded-2xl">
          <div className="absolute top-2 left-2 h-6 w-6 border-t-2 border-l-2 border-cyan-400 rounded-tl shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <div className="absolute top-2 right-2 h-6 w-6 border-t-2 border-r-2 border-cyan-400 rounded-tr shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <div className="absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-cyan-400 rounded-bl shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <div className="absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-cyan-400 rounded-br shadow-[0_0_8px_rgba(6,182,212,0.8)]" />

          {/* Central Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center opacity-40">
            <div className="relative h-6 w-6">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Status HUD */}
      <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-950/80 px-3 py-1 font-mono text-xs font-semibold text-emerald-400 backdrop-blur-md shadow-lg">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span>LIVE BROADCASTING</span>
          </div>
          <span className="rounded-full border border-white/15 bg-black/60 px-2.5 py-1 font-mono text-xs text-white backdrop-blur-md">
            ID: <b className="text-cyan-400">{pairId}</b>
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-white/80">
          <span className="rounded-full border border-white/10 bg-black/60 px-2.5 py-1 backdrop-blur-md">
            {fps} FPS
          </span>
        </div>
      </div>

      {/* Camera Error Message */}
      {camError && (
        <div className="relative z-30 mx-auto max-w-sm rounded-xl border border-destructive/50 bg-destructive/20 p-4 text-center backdrop-blur-md">
          <VideoOff className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-2 text-sm font-semibold">{camError}</p>
          <p className="mt-1 text-xs text-white/70">Allow camera access in your browser settings to broadcast live video.</p>
        </div>
      )}

      {/* Bottom Floating Control Dock */}
      <div className="relative z-20 p-4 pb-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center gap-3">
        <div className="text-center">
          <p className="text-xs font-mono text-white/70">
            Streaming live to Tensora Station · Point camera at fabric surface
          </p>
          <p className="text-[10px] font-mono text-cyan-400 mt-0.5">
            {frameCount} frames transmitted · Active wireless uplink
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleTorch}
            className={`h-12 w-12 rounded-full border flex items-center justify-center transition-all active:scale-95 cursor-pointer backdrop-blur-md ${
              torchOn ? "border-amber-400 bg-amber-400/20 text-amber-300" : "border-white/15 bg-white/10 text-white"
            }`}
            title="Toggle Flashlight"
          >
            {torchOn ? <Flashlight className="h-5 w-5" /> : <FlashlightOff className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={flipCamera}
            className="h-12 w-12 rounded-full border border-white/15 bg-white/10 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer backdrop-blur-md"
            title="Switch front/back lens"
          >
            <RotateCw className="h-5 w-5" />
          </button>

          <Button
            variant="destructive"
            size="sm"
            onClick={onExit}
            className="h-12 px-5 gap-2 rounded-full font-mono text-xs shadow-lg"
          >
            <StopCircle className="h-4 w-4" /> End Broadcast
          </Button>
        </div>
      </div>
    </div>
  );
}
