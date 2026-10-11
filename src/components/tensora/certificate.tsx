import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Certificate } from "@/lib/tensora/data";
import { useTensora, rollStats } from "@/lib/tensora/store";
import { sha256Hex, systemLabel, systemUnit } from "@/lib/tensora/scoring";
import { RollMap } from "./roll-map";
import { TensoraMark } from "./brand";
import { fmtDateTime } from "./ui";
import { cn } from "@/lib/utils";

export function CertificateDocument({ cert }: { cert: Certificate }) {
  const state = useTensora();
  const s = rollStats(state, cert.rollId);
  const session = state.sessions.find((x) => x.rollId === cert.rollId);
  const device = state.devices.find((d) => d.id === session?.deviceId);
  const [hash, setHash] = useState("");
  const [qr, setQr] = useState("");

  useEffect(() => {
    const payload = JSON.stringify({
      cert: cert.id,
      roll: s.roll.id,
      points: s.points,
      score: +s.score.toFixed(2),
      defects: s.list.map((d) => [d.id, d.meter, d.x, d.cls, d.points]),
    });
    void sha256Hex(payload).then(async (h) => {
      setHash(h);
      setQr(await QRCode.toDataURL(`https://verify.araneid.com/c/${cert.id}?h=${h.slice(0, 16)}`, { margin: 1, width: 220 }));
    });
  }, [cert.id, s.points, s.score, s.list, s.roll.id]);

  return (
    <article className="certificate rounded-lg border border-border bg-surface p-5 sm:p-8">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <TensoraMark className="h-11 w-11" />
          <div>
            <h2 className="text-lg font-bold tracking-wide sm:text-xl">ARANEID QUALITY AUDIT CERTIFICATE</h2>
            <div className="label-caps text-primary">Powered by Tensora</div>
          </div>
        </div>
        <div className="font-mono text-xs sm:text-right">
          <div className="text-sm font-bold">{cert.id}</div>
          <div className="text-muted-foreground">Issued {fmtDateTime(cert.issuedAt)}</div>
          <div className="text-muted-foreground">By {cert.issuer}</div>
        </div>
      </header>

      <section className="grid gap-4 border-b border-border py-5 md:grid-cols-[1fr_auto]">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          {[
            ["Roll", s.roll.id],
            ["Lot", s.roll.lot],
            ["Article", `${s.roll.article} (${s.roll.gsm} GSM)`],
            ["Buyer", `${s.buyer.name} (${s.buyer.id})`],
            ["Standard", systemLabel[s.buyer.system]],
            ["Limit", `${s.buyer.limit} ${systemUnit[s.buyer.system]}`],
            ["Inspected", `${s.roll.lengthM.toFixed(1)} m × ${s.roll.widthIn} in`],
            ["Penalty points", `${s.points} pts`],
            ["Inspection", `${session?.location ?? "—"} · ${device?.kind ?? ""} ${device?.id ?? ""}`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="label-caps">{k}</dt>
              <dd className="mt-0.5 text-xs font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className={cn("flex flex-col items-center justify-center rounded-md border px-6 py-4 text-center", s.pass ? "border-pass/50 bg-pass/10" : "border-major/50 bg-major/10")}>
          <div className="label-caps">Score</div>
          <div className={cn("font-mono text-4xl font-bold", s.pass ? "text-pass" : "text-major")}>{s.score.toFixed(1)}</div>
          <div className={cn("mt-1 font-mono text-sm font-bold", s.pass ? "text-pass" : "text-major")}>{s.pass ? "PASS · EXPORT READY" : "REJECT"}</div>
        </div>
      </section>

      <section className="border-b border-border py-5">
        <div className="label-caps mb-2">Roll map</div>
        <RollMap defects={s.list} lengthM={s.roll.lengthM} />
      </section>

      <section className="border-b border-border py-5">
        <div className="label-caps mb-2">Defect coordinate table</div>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1.5 pr-3 font-normal">#</th>
                <th className="pr-3 font-normal">ID</th>
                <th className="pr-3 font-normal">Meter (L)</th>
                <th className="pr-3 font-normal">Width (W, in)</th>
                <th className="pr-3 font-normal">Class</th>
                <th className="pr-3 font-normal">Pts</th>
                <th className="font-normal">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {s.list
                .slice()
                .sort((a, b) => a.meter - b.meter)
                .map((d, i) => (
                  <tr key={d.id} className="border-b border-border/50">
                    <td className="py-1.5 pr-3">{i + 1}</td>
                    <td className="pr-3">{d.id}</td>
                    <td className="pr-3">{d.meter.toFixed(2)}</td>
                    <td className="pr-3">{(d.x * s.roll.widthIn).toFixed(1)}</td>
                    <td className="pr-3">{d.cls}</td>
                    <td className="pr-3">{d.points}</td>
                    <td>{d.source === "manual" ? "manual" : `${(d.confidence * 100).toFixed(1)}%`}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="grid gap-5 pt-5 md:grid-cols-[auto_1fr_1fr]">
        <div className="flex items-center gap-3">
          {qr ? <img src={qr} alt="Verification QR code" className="h-28 w-28 rounded bg-foreground p-1" /> : <div className="h-28 w-28 rounded bg-secondary" />}
        </div>
        <div className="min-w-0">
          <div className="label-caps">SHA-256 verification hash</div>
          <div className="mt-1 break-all font-mono text-[10px] leading-relaxed text-telemetry">{hash || "computing…"}</div>
          <p className="mt-2 text-[11px] text-muted-foreground">Scan the code or visit verify.araneid.com to confirm this certificate has not been altered.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-[10px]">
          {["Inspector", "QC In-charge", "Buyer QA"].map((r) => (
            <div key={r}>
              <div className="h-10 border-b border-border" />
              <div className="label-caps mt-1">{r}</div>
            </div>
          ))}
        </div>
      </footer>
    </article>
  );
}
