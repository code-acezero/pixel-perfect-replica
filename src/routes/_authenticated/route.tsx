import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/tensora/app-shell";
import { CloudSync } from "@/components/tensora/cloud-sync";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Offline: trust the session saved on this device; the server re-checks every write on sync.
    const user = navigator.onLine
      ? (await supabase.auth.getUser()).data.user
      : (await supabase.auth.getSession()).data.session?.user;
    const data = { user };
    if (!data.user) {
      if (typeof window !== "undefined" && localStorage.getItem("tensora_demo_user")) {
        return { userId: "demo-inspector-lead" };
      }
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { userId: data.user.id };
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
