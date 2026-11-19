import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/tensora/app-shell";
import { CloudSync } from "@/components/tensora/cloud-sync";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // 1. Instant 1-Click Demo session check (0ms, no network)
    if (typeof window !== "undefined" && localStorage.getItem("tensora_demo_user")) {
      return { userId: "demo-inspector-lead" };
    }

    // 2. Trust local session first (reads from localStorage without hanging)
    let localUserId: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        localUserId = data.session.user.id;
      }
    } catch {
      // Local storage read error; continue
    }

    if (localUserId) {
      return { userId: localUserId };
    }

    // 3. If online, attempt a fast remote getUser() with a strict timeout to prevent page freezes
    let remoteUserId: string | null = null;
    if (typeof navigator !== "undefined" && navigator.onLine) {
      try {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
        const userPromise = supabase.auth.getUser().then((res) => res.data?.user?.id ?? null).catch(() => null);
        remoteUserId = await Promise.race([userPromise, timeoutPromise]);
      } catch {
        remoteUserId = null;
      }
    }

    if (remoteUserId) {
      return { userId: remoteUserId };
    }

    // 4. Not authenticated: redirect to auth
    throw redirect({ to: "/auth", search: { redirect: location.href } });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { userId } = Route.useRouteContext();
  return (
    <CloudSync userId={userId}>
      <AppShell>
        <Outlet />
      </AppShell>
    </CloudSync>
  );
}
