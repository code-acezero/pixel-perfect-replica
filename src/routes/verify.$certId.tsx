import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/tensora/brand";

export const Route = createFileRoute("/verify/$certId")({
  head: ({ params }) => ({
    meta: [
      { title: `Verify ${params.certId} — Araneid Quality Certificate` },
      { name: "description", content: `Independent verification of Araneid quality audit certificate ${params.certId}, powered by Tensora.` },
      { property: "og:title", content: `Verify certificate ${params.certId}` },
      { property: "og:description", content: "Check the verdict and score of an Araneid quality audit certificate." },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { certId } = Route.useParams();
  const q = useQuery({
    queryKey: ["verify", certId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verify_certificate", { _id: certId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  const c = q.data;
  return (
    <div className="tech-grid grid min-h-screen place-items-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
        <Wordmark />
        <div className="label-caps mt-6">Certificate verification</div>
        <h1 className="font-mono text-xl font-bold">{certId}</h1>
        {q.isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Checking…</p>
        ) : !c ? (
          <div className="mt-6 flex items-start gap-3 rounded border border-major/40 bg-major/10 p-4">
            <ShieldX className="h-6 w-6 shrink-0 text-major" />
            <div><div className="font-semibold">Not found</div><p className="text-sm text-muted-foreground">No certificate with this ID was issued by Tensora. Treat this document as unverified.</p></div>
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-start gap-3 rounded border border-pass/40 bg-pass/10 p-4">
              <ShieldCheck className="h-6 w-6 shrink-0 text-pass" />
              <div><div className="font-semibold">Authentic certificate</div><p className="text-sm text-muted-foreground">Issued by {c.issuer} on {new Date(Number(c.issued_at)).toLocaleString()}</p></div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs">
              {[["Roll", c.roll_id], ["Buyer", c.buyer], ["Article", c.article], ["Score", Number(c.score).toFixed(2)]].map(([k, v]) => (
                <div key={k} className="rounded border border-border bg-surface-2 p-2"><dt className="label-caps">{k}</dt><dd>{v}</dd></div>
              ))}
              <div className="col-span-2 rounded border border-border bg-surface-2 p-2"><dt className="label-caps">Verdict</dt><dd className={c.verdict === "PASS" ? "text-lg font-bold text-pass" : "text-lg font-bold text-major"}>{c.verdict}</dd></div>
            </dl>
          </>
        )}
        <p className="mt-6 text-center font-mono text-[10px] text-muted-foreground"><Link to="/auth" className="hover:text-foreground">Tensora sign in</Link> · © Araneid Industrial Systems</p>
      </div>
    </div>
  );
}
