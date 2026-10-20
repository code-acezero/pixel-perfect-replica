import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel, Tag } from "./ui";
import { useCan } from "@/lib/tensora/use-can";
import { testEndpoint } from "@/lib/tensora/integrations.functions";

type Ep = { id: string; name: string; kind: string; url: string; secret: string; enabled: boolean };
type Dl = { id: string; event: string; cert_id: string | null; status_code: number | null; ok: boolean; error: string | null; created_at: string; endpoint_id: string | null };

const KIND_LABEL: Record<string, string> = { sap: "SAP S/4HANA (QM)", fastreact: "FastReact (MES)", generic: "Generic webhook" };

export function IntegrationsPanel() {
  const isAdmin = useCan("admin");
  const [eps, setEps] = useState<Ep[]>([]);
  const [dls, setDls] = useState<Dl[]>([]);
  const [form, setForm] = useState({ name: "", kind: "sap", url: "" });
  const [shown, setShown] = useState<string | null>(null);
  const test = useServerFn(testEndpoint);

  const load = async () => {
    const [e, d] = await Promise.all([
      supabase.from("integration_endpoints").select("*").order("created_at"),
      supabase.from("integration_deliveries").select("id,event,cert_id,status_code,ok,error,created_at,endpoint_id").order("created_at", { ascending: false }).limit(30),
    ]);
    setEps((e.data as Ep[]) ?? []);
    setDls((d.data as Dl[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.name.trim() || !/^https:\/\//.test(form.url)) { toast.error("Enter a name and an https:// address"); return; }
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(16).padStart(2, "0")).join("");
    const { data, error } = await supabase.from("integration_endpoints").insert({ ...form, secret }).select().single();
    if (error) { toast.error(error.message); return; }
    setShown(data.id);
    setForm({ name: "", kind: "sap", url: "" });
    load();
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
      <Panel title="ERP / MES endpoints">
        <p className="mb-3 text-sm text-muted-foreground">Every certified roll is pushed automatically to each enabled endpoint. Requests are signed with <span className="font-mono">X-Tensora-Signature: sha256=HMAC(secret, timestamp.body)</span>.</p>
        {eps.length === 0 && <p className="text-sm text-muted-foreground">{isAdmin ? "No endpoints yet." : "Only Plant Admins can view and edit endpoints."}</p>}
        <div className="space-y-2">
          {eps.map((ep) => (
            <div key={ep.id} className="rounded border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{ep.name} <Tag>{KIND_LABEL[ep.kind]}</Tag></div>
                  <div className="truncate font-mono text-xs text-muted-foreground">{ep.url}</div>
                </div>
                <Switch checked={ep.enabled} onCheckedChange={async (v) => { await supabase.from("integration_endpoints").update({ enabled: v }).eq("id", ep.id); load(); }} />
              </div>
              {shown === ep.id && <div className="mt-2 break-all rounded bg-muted p-2 font-mono text-xs">Signing secret: {ep.secret}</div>}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={async () => { const r = await test({ data: { id: ep.id } }); r.ok ? toast.success(`Test delivered (${r.status})`) : toast.error(`Test failed: ${r.status ?? ""} ${r.error ?? ""}`); load(); }}>Send test</Button>
                <Button size="sm" variant="ghost" onClick={() => setShown(shown === ep.id ? null : ep.id)}>{shown === ep.id ? "Hide secret" : "Show secret"}</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { await supabase.from("integration_endpoints").delete().eq("id", ep.id); load(); }}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
        {isAdmin && (
          <div className="mt-4 grid gap-2 border-t border-border pt-4">
            <Input placeholder="Name, e.g. SAP Production" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select value={form.kind} onValueChange={(kind) => setForm({ ...form, kind })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(KIND_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="https://… receiving address" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <Button onClick={add}>Add endpoint</Button>
          </div>
        )}
      </Panel>
      <Panel title="Delivery log" bodyClassName="p-0">
        {dls.length === 0 && <p className="p-4 text-sm text-muted-foreground">No deliveries yet.</p>}
        {dls.map((d) => (
          <div key={d.id} className="flex flex-wrap gap-x-3 border-b border-border px-4 py-2 font-mono text-xs last:border-0">
            <span className={d.ok ? "text-pass" : "text-major"}>{d.ok ? "OK" : "FAIL"} {d.status_code ?? "—"}</span>
            <span>{d.event}</span>
            <span>{d.cert_id ?? ""}</span>
            <span className="text-muted-foreground">{eps.find((e) => e.id === d.endpoint_id)?.name ?? ""}</span>
            <span className="ml-auto text-muted-foreground">{new Date(d.created_at).toLocaleString()}</span>
            {d.error && <span className="w-full truncate text-muted-foreground">{d.error}</span>}
          </div>
        ))}
      </Panel>
    </div>
  );
}
