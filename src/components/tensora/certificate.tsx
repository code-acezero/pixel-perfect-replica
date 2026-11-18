import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Certificate, DefectZone } from "@/lib/tensora/data";
import { useTensora, rollStats } from "@/lib/tensora/store";
import { sha256Hex, systemLabel, systemUnit, checkContinuousFault, checkGsmCompliance, checkBowAndSkew } from "@/lib/tensora/scoring";
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

  const cuttableW = s.roll.cuttableWidthIn ?? (s.roll.widthIn - 1.0);
  const avgGsm = s.roll.gsmMeasured || Math.round(((s.roll.gsmLeft ?? s.roll.gsm) + (s.roll.gsmCenter ?? s.roll.gsm) + (s.roll.gsmRight ?? s.roll.gsm)) / 3);
  const cf = checkContinuousFault(s.list);
  const gsmCheck = checkGsmCompliance(s.roll.gsm, {
    left: s.roll.gsmLeft ?? avgGsm,
    center: s.roll.gsmCenter ?? avgGsm,
    right: s.roll.gsmRight ?? avgGsm,
  });
  const bowSkew = checkBowAndSkew(s.roll.bowPct, s.roll.skewPct ?? 1.2);

  useEffect(() => {
    const payload = JSON.stringify({
      cert: cert.id,
      roll: s.roll.id,
      points: s.points,
      score: +s.score.toFixed(2),
      cuttableW,
      avgGsm,
      defects: s.list.map((d) => [d.id, d.meter, d.x, d.cls, d.points, d.zone]),
    });
    void sha256Hex(payload).then(async (h) => {
      setHash(h);
      const origin = typeof window !== "undefined" ? window.location.origin : "https://tensora.vercel.app";
      setQr(await QRCode.toDataURL(`${origin}/verify/${cert.id}?h=${h.slice(0, 16)}`, { margin: 1, width: 220 }));
    });
  }, [cert.id, s.points, s.score, s.list, s.roll.id, cuttableW, avgGsm]);

  return (
    <article className="certificate rounded-lg border border-border bg-surface p-5 sm:p-8 space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <TensoraMark className="h-10 w-auto" />
          <div>
            <h2 className="text-lg font-bold tracking-wide sm:text-xl">ARANEID QUALITY AUDIT CERTIFICATE</h2>
            <div className="label-caps text-primary">Cryptographically Verified · Tensora Optical Intelligence</div>
          </div>
        </div>
        <div className="font-mono text-xs sm:text-right">
          <div className="text-sm font-bold">{cert.id}</div>
          <div className="text-muted-foreground">Issued {fmtDateTime(cert.issuedAt)}</div>
          <div className="text-muted-foreground">Issued by {cert.issuer}</div>
          <div className="text-muted-foreground">Mill: {s.roll.site} ({s.roll.line})</div>
        </div>
      </header>

      {/* Main Spec & Verdict Section */}
      <section className="grid gap-4 border-b border-border pb-5 md:grid-cols-[1fr_auto]">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          {[
            ["Roll ID", s.roll.id],
            ["Dye Batch / Lot", s.roll.dyeBatch || s.roll.lot],
            ["Yarn Count", s.roll.yarnCount || "30/1 Ne Combed"],
            ["Fabric Construction", `${s.roll.article}`],
            ["Shift / Machine", `${s.roll.shift || "Shift A"} · ${s.roll.machineNo || "Line #04"}`],
            ["Buyer / Brand", `${s.buyer.name} (${s.buyer.id})`],
            ["Inspection Standard", systemLabel[s.buyer.system]],
            ["Buyer Limit", `${s.buyer.limit} ${systemUnit[s.buyer.system]}`],
            ["Inspected Dimension", `${s.roll.lengthM.toFixed(1)} m × ${s.roll.widthIn}" gross (${cuttableW}" cuttable)`],
            ["3-Point GSM Cut (L/C/R)", `${s.roll.gsmLeft ?? s.roll.gsm} / ${s.roll.gsmCenter ?? s.roll.gsm} / ${s.roll.gsmRight ?? s.roll.gsm} (Avg ${avgGsm})`],
            ["Penalty Points", `${s.points} pts across ${s.list.length} flaws`],
            ["Inspection Station", `${session?.location ?? "Line #04 Take-down"} · ${device?.name ?? "CAM-01"}`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="label-caps">{k}</dt>
              <dd className="mt-0.5 text-xs font-medium truncate" title={v}>{v}</dd>
            </div>
          ))}
        </dl>
        <div className={cn("flex flex-col items-center justify-center rounded-md border px-8 py-5 text-center min-w-[200px]", s.pass && !cf.hasContinuousFault ? "border-pass/50 bg-pass/10" : "border-major/50 bg-major/10")}>
          <div className="label-caps">ASTM D5430 Score</div>
          <div className={cn("font-mono text-4xl font-bold my-1", s.pass && !cf.hasContinuousFault ? "text-pass" : "text-major")}>
            {s.score.toFixed(1)}
          </div>
          <div className="text-[11px] font-mono text-muted-foreground">{cuttableW}" cuttable basis</div>
          <div className={cn("mt-2 font-mono text-sm font-bold uppercase tracking-wider", s.pass && !cf.hasContinuousFault ? "text-pass" : "text-major")}>
            {s.pass && !cf.hasContinuousFault ? "PASS · EXPORT READY" : "REJECT / HOLD"}
          </div>
        </div>
      </section>

      {/* Bangladeshi RMG Secondary Tests & Physical Compliance Block */}
      <section className="rounded-lg border border-border bg-surface-2/40 p-4">
        <div className="label-caps mb-3 text-telemetry">ASTM & Bangladeshi RMG Physical Quality Verification</div>
        <div className="grid gap-3 sm:grid-cols-3 font-mono text-xs">
          <div className="rounded border border-border bg-surface p-2.5">
            <div className="label-caps text-[10px]">3-Point GSM (ASTM D3776)</div>
            <div className={cn("text-base font-bold mt-1", gsmCheck.passed ? "text-pass" : "text-minor")}>
              {avgGsm} g/m² <span className="text-xs font-normal text-muted-foreground">({gsmCheck.diffPct > 0 ? "+" : ""}{gsmCheck.diffPct}%)</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Edge variance: {gsmCheck.edgeCenterVariancePct}% (spec &le; 3%)
            </div>
          </div>
          <div className="rounded border border-border bg-surface p-2.5">
            <div className="label-caps text-[10px]">Bow & Skew (ASTM D3882)</div>
            <div className={cn("text-base font-bold mt-1", bowSkew.passed ? "text-pass" : "text-minor")}>
              Bow {s.roll.bowPct}% · Skew {s.roll.skewPct ?? 1.2}%
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Spirality risk: <b className="uppercase">{bowSkew.spiralityRisk}</b>
            </div>
          </div>
          <div className="rounded border border-border bg-surface p-2.5">
            <div className="label-caps text-[10px]">Continuous Fault Hold</div>
            <div className={cn("text-base font-bold mt-1", cf.hasContinuousFault ? "text-major" : "text-pass")}>
              {cf.hasContinuousFault ? `FAIL (${cf.streakMeters}m)` : "PASS (Clean)"}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {cf.hasContinuousFault ? "Cylinder check required" : "No continuous repeat lines"}
            </div>
          </div>
        </div>
      </section>

      {/* Visual Roll Defect Map */}
      <section className="border-b border-border pb-5">
        <div className="label-caps mb-2">Visual defect distribution map</div>
        <RollMap defects={s.list} lengthM={s.roll.lengthM} />
      </section>

      {/* Coordinate & Defect Ledger Table */}
      <section className="border-b border-border pb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="label-caps">Defect coordinate & spatial zone ledger</div>
          <span className="font-mono text-[11px] text-muted-foreground">{s.list.length} logged flaws</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1.5 pr-3 font-normal">#</th>
                <th className="pr-3 font-normal">ID</th>
                <th className="pr-3 font-normal">Meter (L)</th>
                <th className="pr-3 font-normal">Cross-Width</th>
                <th className="pr-3 font-normal">Spatial Zone</th>
                <th className="pr-3 font-normal">Class</th>
                <th className="pr-3 font-normal">Pts</th>
                <th className="font-normal">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {s.list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-muted-foreground">
                    Zero defects logged — pristine fabric roll.
                  </td>
                </tr>
              ) : (
                s.list
                  .slice()
                  .sort((a, b) => a.meter - b.meter)
                  .map((d, i) => (
                    <tr key={d.id} className="border-b border-border/50">
                      <td className="py-1.5 pr-3">{i + 1}</td>
                      <td className="pr-3 text-primary">{d.id}</td>
                      <td className="pr-3">{d.meter.toFixed(2)} m</td>
                      <td className="pr-3">{(d.x * s.roll.widthIn).toFixed(1)}"</td>
                      <td className="pr-3 text-muted-foreground">{d.zone || "Center Panel"}</td>
                      <td className="pr-3 font-semibold">{d.cls}</td>
                      <td className="pr-3 font-bold">{d.points} pt</td>
                      <td>{d.source === "manual" ? "manual" : `${(d.confidence * 100).toFixed(1)}%`}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cryptographic Verification Footer */}
      <footer className="grid gap-5 pt-2 md:grid-cols-[auto_1fr_1fr]">
        <div className="flex items-center gap-3">
          {qr ? <img src={qr} alt="Verification QR code" className="h-28 w-28 rounded bg-foreground p-1" /> : <div className="h-28 w-28 rounded bg-secondary" />}
        </div>
        <div className="min-w-0">
          <div className="label-caps">SHA-256 Cryptographic Audit Hash</div>
          <div className="mt-1 break-all font-mono text-[10px] leading-relaxed text-telemetry">{hash || "computing…"}</div>
          <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
            Scan QR code or visit verify portal to confirm cryptographic integrity against original mill inspection stream.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-[10px]">
          {["Mill Inspector", "QC In-charge", "Buyer Auditor"].map((r) => (
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
