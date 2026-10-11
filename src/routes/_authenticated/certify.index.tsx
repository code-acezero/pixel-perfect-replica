import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FileBadge } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, Tag, fmtDateTime } from "@/components/tensora/ui";
import { useTensora, rollStats } from "@/lib/tensora/store";
import { useCan } from "@/lib/tensora/use-can";

export const Route = createFileRoute("/_authenticated/certify/")({
  validateSearch: (s: Record<string, unknown>): { roll?: string } => (typeof s["roll"] === "string" ? { roll: s["roll"] } : {}),
  head: () => ({
    meta: [
      { title: "Tensora Certify — Buyer Compliance · Araneid" },
      { name: "description", content: "Issue tamper-evident Araneid Quality Audit Certificates with defect coordinates, hash and QR verification." },
      { property: "og:title", content: "Tensora Certify — Araneid" },
      { property: "og:description", content: "Tamper-evident buyer compliance certificates." },
    ],
  }),
  component: CertifyPage,
});

function CertifyPage() {
  const { roll: preset } = Route.useSearch();
  const navigate = useNavigate();
  const state = useTensora();
  const { certificates, rolls, issueCertificate, activeRollId } = state;
  const canCertify = useCan("certify");
  const [roll, setRoll] = useState(preset ?? activeRollId);
  const s = rollStats(state, roll);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader module="Tensora Certify" title="Buyer Compliance Certificates" description="Evidence-grade audit certificates with defect coordinates, roll map and cryptographic verification." />
      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Panel title="Issue certificate">
          <div className="label-caps mb-1.5">Roll</div>
          <Select value={roll} onValueChange={setRoll}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{rolls.map((r) => <SelectItem key={r.id} value={r.id}>{r.id} · {r.article}</SelectItem>)}</SelectContent>
          </Select>
          <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs">
            <div className="rounded border border-border bg-surface-2 p-2"><div className="label-caps">Buyer</div>{s.buyer.name}</div>
            <div className="rounded border border-border bg-surface-2 p-2"><div className="label-caps">Score</div>{s.score.toFixed(1)} / {s.buyer.limit}</div>
            <div className="rounded border border-border bg-surface-2 p-2"><div className="label-caps">Pending</div>{state.defects.filter((d) => d.rollId === roll && d.status === "pending").length} defects</div>
            <div className="rounded border border-border bg-surface-2 p-2"><div className="label-caps">Verdict</div><span className={s.pass ? "text-pass" : "text-major"}>{s.pass ? "PASS" : "REJECT"}</span></div>
          </div>
          <Button
            className="mt-4 h-11 w-full gap-2"
            disabled={!canCertify}
            onClick={() => {
              const id = issueCertificate(roll);
              toast.success(`Certificate ${id} issued`);
              navigate({ to: "/certify/$certId", params: { certId: id } });
            }}
          >
            <FileBadge className="h-4 w-4" /> {canCertify ? "Generate certificate" : "Quality Manager sign-off required"}
          </Button>
        </Panel>
        <Panel title={`Certificate register · ${certificates.length}`} bodyClassName="p-0">
          {certificates.map((c) => (
            <Link key={c.id} to="/certify/$certId" params={{ certId: c.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-accent/30 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <div className="font-mono text-sm text-primary">{c.id}</div>
              <div className="hidden font-mono text-xs sm:block">Roll {c.rollId}</div>
              <div className="hidden text-xs text-muted-foreground sm:block">{fmtDateTime(c.issuedAt)} · {c.issuer}</div>
              <Tag tone={c.verdict === "PASS" ? "pass" : "major"}>{c.verdict}</Tag>
            </Link>
          ))}
        </Panel>
      </div>
    </div>
  );
}
