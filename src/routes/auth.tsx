import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wordmark } from "@/components/tensora/brand";
import { checkGoogleOAuthStatus } from "@/lib/tensora/auth.functions";

function safeRedirect(v: unknown) {
  if (typeof v !== "string") return "/";
  try {
    const u = new URL(v, "http://x");
    return u.pathname.startsWith("/") && !u.pathname.startsWith("//") && u.pathname !== "/auth" ? u.pathname + u.search : "/";
  } catch {
    return "/";
  }
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
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
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Check for returning OAuth errors or existing active session
  useEffect(() => {
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);

    if (hash && hash.includes("error=")) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
      const err = hashParams.get("error_description") || hashParams.get("error");
      if (err) {
        toast.error(decodeURIComponent(err).replace(/\+/g, " "));
      }
    } else if (searchParams.has("error")) {
      const err = searchParams.get("error_description") || searchParams.get("error");
      if (err) {
        toast.error(decodeURIComponent(err).replace(/\+/g, " "));
      }
    }

    // Auto-navigate if already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const next = sessionStorage.getItem("tensora-after-auth") || target;
        sessionStorage.removeItem("tensora-after-auth");
        navigate({ to: next, replace: true });
      }
    });
  }, [navigate, target]);

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
    setGoogleBusy(true);
    if (target !== "/") sessionStorage.setItem("tensora-after-auth", target);

    try {
      // 1. Verify if Google OAuth is configured in Supabase before redirecting
      const status = await checkGoogleOAuthStatus().catch(() => ({ enabled: false, error: "Network check failed" }));
      if (!status.enabled) {
        setGoogleBusy(false);
        setGoogleModalOpen(true);
        return;
      }

      // 2. Direct native Supabase OAuth
      const redirectUri = `${window.location.origin}/auth`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setGoogleBusy(false);
        toast.error(error.message || "Google sign-in error");
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      setGoogleBusy(false);
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      toast.error(msg);
    }
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
                  className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          <Button type="submit" className="h-9 w-full text-xs font-semibold" disabled={busy || googleBusy}>
            {busy ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
              </span>
            ) : mode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
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
            disabled={busy || googleBusy}
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
            disabled={busy || googleBusy}
            className="h-9 text-xs border-border hover:bg-accent cursor-pointer flex items-center justify-center gap-1.5 font-medium"
            onClick={google}
          >
            {googleBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <GoogleIcon className="h-3.5 w-3.5 shrink-0" />
            )}
            Google
          </Button>
        </div>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
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

      {/* Google OAuth Provider Setup Notice Dialog */}
      <Dialog open={googleModalOpen} onOpenChange={setGoogleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <GoogleIcon className="h-5 w-5 shrink-0" /> Google Sign-In Not Configured Yet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              Google OAuth is not enabled in your Supabase project (<code>mgjqyymqhsxnwkuqskfi</code>).
            </p>
            <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-1 font-mono text-[11px] text-foreground">
              <div className="font-semibold text-primary">To enable real Google sign-in:</div>
              <div>1. Open your Supabase Dashboard: <b>Auth &gt; Providers &gt; Google</b></div>
              <div>2. Toggle <b>Enable Google provider</b></div>
              <div>3. Enter your Google Cloud Client ID & Secret</div>
            </div>
            <p>
              For instant testing, demo presentation, or review without OAuth setup, use the <b>1-Click Demo</b>:
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setGoogleModalOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                setGoogleModalOpen(false);
                demoAccess();
              }}
              className="text-xs bg-primary text-primary-foreground font-semibold"
            >
              <Zap className="h-3.5 w-3.5 mr-1" /> Continue as Demo Inspector
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
