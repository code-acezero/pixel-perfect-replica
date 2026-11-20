import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as cloud from "@/lib/tensora/cloud";
import { primaryRole, type DbRole } from "@/lib/tensora/permissions";
import { useTensora } from "@/lib/tensora/store";
import { TensoraMark } from "./brand";
import { loadSnapshot, saveSnapshot, startSyncWatcher } from "@/lib/tensora/offline";
import { alertsSeed, buyersSeed, certificatesSeed, defectsSeed, devicesSeed, rollsSeed, sessionsSeed } from "@/lib/tensora/data";

/** Loads the organisation's data once after sign-in and keeps it live across devices. */
export function CloudSync({ userId, children }: { userId: string; children: ReactNode }) {
  const ready = useTensora((s) => s.ready);
  const meId = useTensora((s) => s.me?.id);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    const stopWatcher = startSyncWatcher();

    if (userId.startsWith("demo-")) {
      useTensora.getState().hydrate(
        {
          buyers: buyersSeed,
          rolls: rollsSeed,
          devices: devicesSeed,
          sessions: sessionsSeed,
          defects: defectsSeed,
          alerts: alertsSeed,
          certificates: certificatesSeed,
        },
        {
          id: userId,
          name: "Tariqul Islam (Plant Admin / Lead QC)",
          email: "tariqul.qc@araneid.internal",
          role: "plant_admin",
        }
      );
      return () => {
        cancelled = true;
        stopWatcher();
      };
    }

    type Cached = { snap: Awaited<ReturnType<typeof cloud.loadAll>>; me: Awaited<ReturnType<typeof cloud.loadMe>> };
    const apply = ({ snap, me }: Cached) => {
      // If user account is brand new and has no rolls yet, provide a clean starter roll without any fake defects
      const hasRolls = snap.rolls && snap.rolls.length > 0;
      const cleanSnap = hasRolls
        ? snap
        : {
            ...snap,
            rolls: [
              {
                id: "ROLL-01",
                article: "100% Cotton Single Jersey",
                gsm: 180,
                widthIn: 60,
                lengthM: 0,
                buyerId: snap.buyers?.[0]?.id || "B-INTERNAL",
                lot: "LOT-01",
                supplier: "In-House Mill",
                site: "MILL-01",
                line: "Optical Inspection Frame",
                status: "in_progress",
              },
            ],
            sessions: [
              {
                id: "INS-001",
                rollId: "ROLL-01",
                deviceId: "rear",
                inspector: me.name,
                location: "Inspection Frame #01",
                site: "MILL-01",
                startedAt: Date.now(),
                status: "live",
                metersInspected: 0,
              },
            ],
            defects: snap.defects || [],
            alerts: snap.alerts || [],
            certificates: snap.certificates || [],
          };

      useTensora.getState().hydrate(cleanSnap, {
        id: userId,
        name: me.name,
        email: me.email,
        role: primaryRole(me.roles as DbRole[]),
      });
    };

    const applyCleanUserFallback = async () => {
      let email = "";
      let name = "Plant Inspector";
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          email = data.user.email || "";
          name = data.user.user_metadata?.full_name || (email ? email.split("@")[0] : "Plant Inspector");
        }
      } catch {}

      // Clean fresh state for real user account — ZERO fake historical defects!
      useTensora.getState().hydrate(
        {
          buyers: [],
          rolls: [
            {
              id: "ROLL-01",
              article: "100% Cotton Single Jersey",
              gsm: 180,
              widthIn: 60,
              lengthM: 0,
              buyerId: "B-INTERNAL",
              lot: "LOT-01",
              supplier: "In-House Mill",
              site: "MILL-01",
              line: "Optical Inspection Frame",
              status: "in_progress",
            },
          ],
          devices: [
            {
              id: "rear",
              name: "Main Camera",
              kind: "mobile",
              location: "Handheld Inspection",
              status: "online",
              resolution: "1080p",
              fps: 60,
              quality: 98,
              lastSession: "INS-001",
              calibrated: true,
              batteryPct: 100,
              streamRole: "overhead_main",
              streamUrl: "",
              torchOn: false,
              pingMs: 12,
            },
          ],
          sessions: [
            {
              id: "INS-001",
              rollId: "ROLL-01",
              deviceId: "rear",
              inspector: name,
              location: "Handheld Frame #01",
              site: "MILL-01",
              startedAt: Date.now(),
              status: "live",
              metersInspected: 0,
            },
          ],
          defects: [],
          alerts: [],
          certificates: [],
        },
        {
          id: userId,
          name,
          email,
          role: "plant_admin",
        }
      );
    };

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase cloud sync timed out")), 10000)
    );

    Promise.race([Promise.all([cloud.loadAll(), cloud.loadMe(userId)]), timeoutPromise])
      .then(([snap, me]) => {
        if (cancelled) return;
        apply({ snap, me });
        // Keep a copy on this device; thumbnails are signed URLs, so drop them to stay small.
        void saveSnapshot(`snap:${userId}`, { snap: { ...snap, defects: snap.defects.map(({ thumb: _t, ...d }) => d) }, me });
      })
      .catch(async () => {
        if (cancelled) return;
        try {
          const cached = await loadSnapshot<Cached>(`snap:${userId}`);
          if (cancelled) return;
          if (cached) {
            apply(cached);
          } else {
            await applyCleanUserFallback();
          }
        } catch {
          if (!cancelled) await applyCleanUserFallback();
        }
      });

    const st = useTensora.getState;
    const channel = supabase
      .channel("tensora-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "defects" }, async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = p.new as any;
        if (!row?.id) return;
        const existing = st().defects.find((d) => d.id === row.id);
        let thumb = existing?.thumb;
        if (!thumb && row.thumb_path) thumb = (await cloud.signThumbs([row]))[row.thumb_path];
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
      stopWatcher();
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  if (!ready || meId !== userId) {
    return (
      <div className="tech-grid grid min-h-screen place-items-center bg-background p-6 text-center">
        <div>
          <TensoraMark className="mx-auto h-12 w-auto" />
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
