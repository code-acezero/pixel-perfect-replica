import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel, SeverityBadge, Tag } from "@/components/tensora/ui";
import { DEFECT_CLASSES, DEFAULT_POINTS, type DefectClass } from "@/lib/tensora/data";
import { useCan } from "@/lib/tensora/use-can";

interface Example { id: string; cls: string; points: number; image_path: string; source: string; url?: string | undefined }

export function TrainingLibrary() {
  const canManage = useCan("review");
  const [items, setItems] = useState<Example[]>([]);
  const [cls, setCls] = useState<DefectClass>("Hole");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("training_examples").select("id, cls, points, image_path, source").order("created_at", { ascending: false });
    const rows = data ?? [];
    const signed = rows.length ? (await supabase.storage.from("defect-crops").createSignedUrls(rows.map((r) => r.image_path), 3600)).data : [];
    setItems(rows.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl ?? undefined })));
  };
  useEffect(() => { void load(); }, []);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      const path = `training/${crypto.randomUUID()}.${f.name.split(".").pop() || "jpg"}`;
      const up = await supabase.storage.from("defect-crops").upload(path, f, { contentType: f.type });
      if (up.error) { toast.error(`Upload failed: ${up.error.message}`); continue; }
      const ins = await supabase.from("training_examples").insert({ cls, points: DEFAULT_POINTS[cls], image_path: path, source: "upload" });
      if (ins.error) toast.error(ins.error.message);
    }
    setBusy(false);
    toast.success("Teaching photos added");
    void load();
  };

  const remove = async (id: string) => {
    await supabase.from("training_examples").delete().eq("id", id);
    setItems((x) => x.filter((i) => i.id !== id));
  };

  const counts = DEFECT_CLASSES.map((c) => [c, items.filter((i) => i.cls === c).length] as const);

  return (
    <div className="grid gap-3">
      <Panel title="AI Training Library">
        <p className="text-sm text-muted-foreground">
          Tensora Vision compares every camera frame with these verified photos of your real fabric. Defects confirmed or reclassified in Triage are added automatically; dismissed ones are removed.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {counts.map(([c, n]) => <Tag key={c}>{c}: {n}</Tag>)}
        </div>
        {canManage ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Select value={cls} onValueChange={(v) => setCls(v as DefectClass)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{DEFECT_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Button asChild disabled={busy}>
              <label className="cursor-pointer">
                {busy ? "Uploading…" : "Upload photos"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
              </label>
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">Only QC Leads and above can add or remove teaching photos.</p>
        )}
      </Panel>
      {items.length === 0 ? (
        <Panel><p className="text-sm text-muted-foreground">No teaching photos yet. Upload some, or confirm defects in Triage.</p></Panel>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((i) => (
            <div key={i.id} className="overflow-hidden rounded-md border border-border bg-card">
              {i.url ? <img src={i.url} alt={i.cls} className="aspect-video w-full object-cover" /> : <div className="aspect-video bg-muted" />}
              <div className="flex items-center gap-2 p-2 text-xs">
                <span className="flex-1 truncate">{i.cls}</span>
                <SeverityBadge points={i.points} />
              </div>
              <div className="flex items-center justify-between px-2 pb-2 text-[10px] uppercase text-muted-foreground">
                <span>{i.source === "triage" ? "From Triage" : "Uploaded"}</span>
                {canManage && <button className="text-major hover:underline" onClick={() => void remove(i.id)}>Remove</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
