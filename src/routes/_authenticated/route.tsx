import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/tensora/app-shell";
import { CloudSync } from "@/components/tensora/cloud-sync";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // 1. Trust real authenticated Supabase session FIRST (reads from storage immediately)
    let localUserId: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        localUserId = data.session.user.id;
        // User is genuinely authenticated: remove any lingering demo flag
        if (typeof window !== "undefined") {
          localStorage.removeItem("tensora_demo_user");
        }
      }
    } catch {
      // Local storage read error; continue
    }

    if (localUserId) {
      return { userId: localUserId };
    }

    // 2. Check remote getUser if session is not yet loaded in local state
    let remoteUserId: string | null = null;
    if (typeof navigator !== "undefined" && navigator.onLine) {
      try {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
        const userPromise = supabase.auth.getUser().then((res) => res.data?.user?.id ?? null).catch(() => null);
        remoteUserId = await Promise.race([userPromise, timeoutPromise]);
        if (remoteUserId && typeof window !== "undefined") {
          localStorage.removeItem("tensora_demo_user");
        }
      } catch {
        remoteUserId = null;
      }
    }

    if (remoteUserId) {
      return { userId: remoteUserId };
    }

    // 3. Fallback: Only if user explicitly clicked "Demo Mode" without signing in
    if (typeof window !== "undefined" && localStorage.getItem("tensora_demo_user")) {
      return { userId: "demo-inspector-lead" };
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
