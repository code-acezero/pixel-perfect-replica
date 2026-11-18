import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/tensora/brand";

function safeRedirect(v: unknown) {
  if (typeof v !== "string") return "/";
  try {
    const u = new URL(v, "http://x");
    return u.pathname.startsWith("/") && !u.pathname.startsWith("//") && u.pathname !== "/auth" ? u.pathname + u.search : "/";
  } catch {
    return "/";
  }
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s["redirect"] === "string" ? (s["redirect"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Sign in — Tensora by Araneid" },
      { name: "description", content: "Sign in to Tensora, the camera-first textile quality platform from Araneid." },
      { property: "og:title", content: "Sign in — Tensora by Araneid" },
      { property: "og:description", content: "Access inspections, triage, grading and buyer certificates." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const target = safeRedirect(search.redirect);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      navigate({ to: target, replace: true });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + target, data: { full_name: name } },
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      if (data.session) navigate({ to: target, replace: true });
      else toast.success("Check your email to confirm your account");
    }
  };

  const google = async () => {
    if (target !== "/") sessionStorage.setItem("tensora-after-auth", target);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) { toast.error(res.error.message ?? "Google sign-in failed"); return; }
    if (res.redirected) return;
    navigate({ to: target, replace: true });
  };

  const forgot = async () => {
    if (!email) { toast("Enter your email first"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent");
  };

  const demoAccess = () => {
    localStorage.setItem("tensora_demo_user", "true");
    toast.success("Signed into Tensora Plant Demo session!");
    navigate({ to: target, replace: true });
  };

  return (
    <div className="tech-grid grid min-h-screen place-items-center bg-background p-4">
      <div className="w-full max-w-[360px] rounded-lg border border-border bg-surface p-5 shadow-2xl">
        <Wordmark centered />

        <div className="mt-4 mb-3 text-center">
          <h1 className="text-base font-semibold">
            {mode === "signin" ? "Sign in to workspace" : "Create plant account"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mode === "signin" ? "Camera-first textile quality platform." : "New accounts start as Field Inspector."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {mode === "signup" && (
            <div>
              <Input
                id="n2"
                placeholder="Full name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          )}

          <div>
            <Input
              id="e1"
              type="email"
              placeholder="Work email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <Input
              id="p1"
              type="password"
              placeholder="Password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 text-xs"
            />
            {mode === "signin" && (
              <div className="mt-1 flex justify-end">
                <button
                  type="button"
                  onClick={forgot}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          <Button type="submit" className="h-9 w-full text-xs font-semibold" disabled={busy}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="my-2.5 flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
          <span className="h-px flex-1 bg-border" />
          <span>or fast connect</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-9 border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium cursor-pointer"
            onClick={demoAccess}
            title="Instant demo inspection station access"
          >
            <Zap className="h-3.5 w-3.5 mr-1 text-telemetry" />
            1-Click Demo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 text-xs border-border hover:bg-accent cursor-pointer"
            onClick={google}
          >
            Google
          </Button>
        </div>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? (
              <>Don&apos;t have an account? <span className="text-primary hover:underline font-medium">Create one</span></>
            ) : (
              <>Already have an account? <span className="text-primary hover:underline font-medium">Sign in</span></>
            )}
          </button>
        </div>

        <div className="mt-3 border-t border-border/50 pt-2 text-center font-mono text-[10px] text-muted-foreground">
          © Araneid Industrial Systems ·{" "}
          <Link to="/verify/$certId" params={{ certId: "QAC-2026-0031" }} className="hover:text-foreground underline">
            Verify certificate
          </Link>
        </div>
      </div>
    </div>
  );
}
