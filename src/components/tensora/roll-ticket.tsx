import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Roll, Buyer } from "@/lib/tensora/data";
import { sha256Hex } from "@/lib/tensora/scoring";
import { cn } from "@/lib/utils";

export interface RollTicketProps {
  roll: Roll;
  buyer?: Buyer;
  score?: number;
  pass?: boolean;
}

export function RollTicketModal({ roll, buyer, score = 0, pass = true }: RollTicketProps) {
  const [open, setOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  if (!roll) return null;
  const cuttableW = roll.cuttableWidthIn ?? (roll.widthIn - 1.0);
  const avgGsm = roll.gsmMeasured || Math.round(((roll.gsmLeft ?? roll.gsm) + (roll.gsmCenter ?? roll.gsm) + (roll.gsmRight ?? roll.gsm)) / 3);

  useEffect(() => {
    if (!open) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://tensora.vercel.app";
    void QRCode.toDataURL(`${origin}/trace/${roll.id}`, { margin: 1, width: 200 }).then(setQrUrl);
  }, [open, roll.id]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Roll Ticket - ${roll.id}</title>
          <style>
            @page { size: 4in 6in; margin: 0.15in; }
            body { font-family: monospace; font-size: 11px; margin: 0; padding: 10px; color: #000; background: #fff; }
            .ticket { border: 2px solid #000; padding: 12px; border-radius: 4px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
            .title { font-size: 14px; font-weight: bold; }
            .roll-id { font-size: 24px; font-weight: 900; letter-spacing: 1px; margin: 4px 0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin: 6px 0; }
            .item { border-bottom: 1px dashed #ccc; padding: 2px 0; }
            .label { font-size: 8px; text-transform: uppercase; color: #555; }
            .val { font-size: 11px; font-weight: bold; }
            .stamp { text-align: center; border: 2px solid #000; padding: 6px; font-size: 16px; font-weight: bold; margin: 8px 0; }
            .qr { text-align: center; margin-top: 6px; }
            .qr img { width: 90px; height: 90px; }
            .sign { display: grid; grid-template-columns: 1fr 1fr; margin-top: 12px; font-size: 9px; text-align: center; }
            .line { border-bottom: 1px solid #000; height: 20px; margin-bottom: 2px; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <div class="title">ASHULIA COMPOSITE MILL — UNIT 03</div>
              <div>TEXTILE INSPECTION & TRACEABILITY TICKET</div>
              <div class="roll-id">#${roll.id}</div>
              <div>${roll.article}</div>
            </div>

            <div class="grid">
              <div class="item"><div class="label">Shift</div><div class="val">${roll.shift || "Shift A"}</div></div>
              <div class="item"><div class="label">Machine / Cylinder</div><div class="val">${roll.machineNo || "Line #04"}</div></div>
              <div class="item"><div class="label">Dye Batch / Lot</div><div class="val">${roll.dyeBatch || roll.lot}</div></div>
              <div class="item"><div class="label">Yarn Count</div><div class="val">${roll.yarnCount || "30/1 Ne Combed"}</div></div>
              <div class="item"><div class="label">Length</div><div class="val">${roll.lengthM.toFixed(1)} m</div></div>
              <div class="item"><div class="label">Width (Gross/Cut)</div><div class="val">${roll.widthIn}" / ${cuttableW}"</div></div>
              <div class="item"><div class="label">3-Pt GSM (L/C/R)</div><div class="val">${roll.gsmLeft ?? roll.gsm}/${roll.gsmCenter ?? roll.gsm}/${roll.gsmRight ?? roll.gsm}</div></div>
              <div class="item"><div class="label">Avg GSM / Target</div><div class="val">${avgGsm} / ${roll.gsm} g/m²</div></div>
              <div class="item"><div class="label">Buyer / PO</div><div class="val">${buyer?.name || "H&M Global"}</div></div>
              <div class="item"><div class="label">4-Point Score</div><div class="val">${score.toFixed(1)} pts/100yd²</div></div>
            </div>

            <div class="stamp">${pass ? "★★ GRADE A · EXPORT PASSED ★★" : "▲ REJECT / HOLD ▲"}</div>

            <div class="qr">
              ${qrUrl ? `<img src="${qrUrl}" alt="QR" />` : ""}
              <div style="font-size: 8px;">SCAN FOR CRYPTOGRAPHIC TRACEABILITY CERTIFICATE</div>
            </div>

            <div class="sign">
              <div><div class="line"></div>INSPECTOR SIGNATURE</div>
              <div><div class="line"></div>QUALITY MANAGER SIGNATURE</div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 text-xs">
          <QrCode className="h-4 w-4" /> Thermal Roll Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thermal Roll Ticket (4" × 6" Mill Adhesive Label)</DialogTitle>
        </DialogHeader>

        {/* Realistic Industrial Thermal Label Preview */}
        <div className="rounded-lg border-2 border-black bg-white p-5 font-mono text-black shadow-inner">
          <div className="border-b-2 border-black pb-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold">
              Ashulia Composite Mill — Unit 03
            </div>
            <div className="text-xs font-semibold">KNITWEAR FINISHING & QA DIVISION</div>
            <div className="my-1 text-3xl font-black tracking-tight">#{roll.id}</div>
            <div className="text-xs truncate font-medium text-neutral-800">{roll.article}</div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-3 text-xs border-b border-neutral-300">
            <div>
              <span className="block text-[9px] uppercase text-neutral-500">Shift</span>
              <span className="font-bold truncate block">{roll.shift || "Shift A (06:00-14:00)"}</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase text-neutral-500">Machine / Cylinder</span>
              <span className="font-bold truncate block">{roll.machineNo || "Mayer & Cie #14"}</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase text-neutral-500">Dye Batch / Lot</span>
              <span className="font-bold font-mono truncate block">{roll.dyeBatch || roll.lot}</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase text-neutral-500">Yarn Count</span>
              <span className="font-bold truncate block">{roll.yarnCount || "30/1 Ne Combed"}</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase text-neutral-500">Length</span>
              <span className="font-bold">{roll.lengthM.toFixed(1)} m</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase text-neutral-500">Cuttable Width</span>
              <span className="font-bold">{cuttableW}" ({roll.widthIn}" gross)</span>
            </div>
            <div className="col-span-2">
              <span className="block text-[9px] uppercase text-neutral-500">3-Pt GSM Cut (L/C/R)</span>
              <span className="font-bold">
                {roll.gsmLeft ?? roll.gsm} / {roll.gsmCenter ?? roll.gsm} / {roll.gsmRight ?? roll.gsm} g/m² (Avg: {avgGsm})
              </span>
            </div>
          </div>

          <div className={cn("my-3 rounded border-2 py-2 text-center font-bold tracking-wide text-sm", pass ? "border-black bg-neutral-100" : "border-black bg-neutral-200")}>
            {pass ? "★ GRADE A · EXPORT READY ★" : "▲ REJECT / QUALITY HOLD ▲"}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-[10px] space-y-0.5 text-neutral-700">
              <div>ASTM D5430 Score: <b>{score.toFixed(1)} pt/100yd²</b></div>
              <div>Buyer Limit: <b>{buyer?.limit || 20} pts</b></div>
              <div className="text-[8px] text-neutral-500">SHA-256 tamper-evident certified</div>
            </div>
            {qrUrl ? <img src={qrUrl} alt="QR Code" className="h-16 w-16 border border-black p-0.5" /> : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-center text-[9px] text-neutral-600">
            <div>
              <div className="border-b border-black h-4 mb-1" />
              Inspector Signature
            </div>
            <div>
              <div className="border-b border-black h-4 mb-1" />
              QC Lead Signature
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Close</Button>
          <Button size="sm" className="gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print Thermal Sticker
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
