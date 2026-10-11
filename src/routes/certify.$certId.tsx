import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CertificateDocument } from "@/components/tensora/certificate";
import { useTensora } from "@/lib/tensora/store";

export const Route = createFileRoute("/certify/$certId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.certId} — Araneid Quality Audit Certificate` },
      { name: "description", content: `Araneid Quality Audit Certificate ${params.certId}, powered by Tensora.` },
      { property: "og:title", content: `${params.certId} — Araneid Quality Audit Certificate` },
      { property: "og:description", content: "Tamper-evident fabric inspection certificate." },
    ],
  }),
  component: CertView,
});

function CertView() {
  const { certId } = Route.useParams();
  const cert = useTensora((s) => s.certificates.find((c) => c.id === certId));
  if (!cert) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        Certificate not found. <Link to="/certify" className="text-primary">Back to register</Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link to="/certify" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ChevronLeft className="h-3.5 w-3.5" /> Certificates</Link>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => { void navigator.clipboard?.writeText(window.location.href); toast.success("Share link copied"); }}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Button className="gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / PDF</Button>
        </div>
      </div>
      <CertificateDocument cert={cert} />
    </div>
  );
}
