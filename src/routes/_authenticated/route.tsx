import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/tensora/app-shell";
import { CloudSync } from "@/components/tensora/cloud-sync";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } });
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
