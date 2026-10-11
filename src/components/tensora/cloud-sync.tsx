import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as cloud from "@/lib/tensora/cloud";
import { primaryRole, type DbRole } from "@/lib/tensora/permissions";
import { useTensora } from "@/lib/tensora/store";
import { TensoraMark } from "./brand";

/** Loads the organisation's data once after sign-in and keeps it live across devices. */
export function CloudSync({ userId, children }: { userId: string; children: ReactNode }) {
  const ready = useTensora((s) => s.ready);
  const meId = useTensora((s) => s.me?.id);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([cloud.loadAll(), cloud.loadMe(userId)])
      .then(([snap, me]) => {
        if (cancelled) return;
        useTensora.getState().hydrate(snap, { id: userId, name: me.name, email: me.email, role: primaryRole(me.roles as DbRole[]) });
      })
      .catch((e: Error) => !cancelled && setError(e.message));

    const st = useTensora.getState;
    const channel = supabase
      .channel("tensora-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "defects" }, async (p) => {
        const row = p.new as Record<string, unknown>;
        if (!row?.id) return;
        const existing = st().defects.find((d) => d.id === row.id);
        let thumb = existing?.thumb;
        if (!thumb && row.thumb_path) thumb = (await cloud.signThumbs([row]))[row.thumb_path as string];
        st().upsertDefect(cloud.toDefect(row, thumb));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, (p) => {
        if (p.eventType === "DELETE") st().upsertAlert(null, (p.old as { id: string }).id);
        else st().upsertAlert(cloud.toAlert(p.new));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inspection_sessions" }, (p) => {
        if (p.new && (p.new as { id?: string }).id) st().upsertSession(cloud.toSession(p.new));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "certificates" }, (p) => {
        st().upsertCertificate(cloud.toCert(p.new));
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  if (!ready || meId !== userId) {
    return (
      <div className="tech-grid grid min-h-screen place-items-center bg-background p-6 text-center">
        <div>
          <TensoraMark className="mx-auto h-12 w-12" />
          {error ? (
            <>
              <p className="mt-4 text-sm font-medium">Couldn't load your plant data</p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
              <button className="mt-4 text-sm text-primary underline" onClick={() => location.reload()}>Try again</button>
            </>
          ) : (
            <p className="mt-4 flex items-center gap-2 font-mono text-xs text-telemetry">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing with Tensora Cloud…
            </p>
          )}
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
