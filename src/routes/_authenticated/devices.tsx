import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";
import { Plus, Smartphone, Tablet, Video, Webcam, Cctv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, Panel, Tag } from "@/components/tensora/ui";
import { useTensora } from "@/lib/tensora/store";
import type { Device } from "@/lib/tensora/data";

export const Route = createFileRoute("/_authenticated/devices")({
  head: () => ({
    meta: [
      { title: "Tensora Devices — Camera Fleet · Araneid" },
      { name: "description", content: "Pair phones, tablets, webcams, USB and IP cameras as Tensora inspection stations." },
      { property: "og:title", content: "Tensora Devices — Araneid" },
      { property: "og:description", content: "Manage your camera fleet." },
    ],
  }),
  component: DevicesPage,
});

const ICON: Record<Device["kind"], typeof Smartphone> = { Phone: Smartphone, Tablet, Webcam, "USB Camera": Video, "IP Camera": Cctv };

function DevicesPage() {
  const devices = useTensora((s) => s.devices);
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState("");
  useEffect(() => {
    if (open) void QRCode.toDataURL(`${window.location.origin}/capture?pair=ASH-U03-${Date.now().toString(36)}`, { margin: 1, width: 240 }).then(setQr);
  }, [open]);
  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader module="Tensora Devices" title="Camera Fleet" description="Any camera becomes an inspection station. No fixed hardware required." actions={<Button className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Pair device</Button>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {devices.map((d) => {
          const Icon = ICON[d.kind];
          return (
            <Panel key={d.id}>
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border bg-surface-2"><Icon className="h-5 w-5 text-telemetry" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{d.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{d.id} · {d.kind}</div>
                </div>
                <Tag tone={d.status === "online" ? "pass" : d.status === "idle" ? "minor" : "default"}>{d.status}</Tag>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 font-mono text-xs">
                <div><dt className="label-caps">Res</dt><dd>{d.resolution}·{d.fps}</dd></div>
                <div><dt className="label-caps">Quality</dt><dd className="text-telemetry">{d.quality}%</dd></div>
                <div><dt className="label-caps">Calib.</dt><dd className={d.calibrated ? "text-pass" : "text-minor"}>{d.calibrated ? "OK" : "Due"}</dd></div>
              </dl>
              <div className="mt-3 truncate text-xs text-muted-foreground">{d.location} · last {d.lastSession}</div>
            </Panel>
          );
        })}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader><DialogTitle>Pair a camera</DialogTitle></DialogHeader>
          {qr ? <img src={qr} alt="Pairing QR code" className="mx-auto h-56 w-56 rounded bg-foreground p-2" /> : <div className="mx-auto h-56 w-56 rounded bg-secondary" />}
          <p className="text-sm text-muted-foreground">Scan with any phone or tablet to open Tensora Capture and join this site as a camera.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
