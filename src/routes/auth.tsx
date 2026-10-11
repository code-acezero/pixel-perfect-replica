import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" ? s.redirect : undefined }),
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
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    navigate({ to: target, replace: true });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + target, data: { full_name: name } },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (data.session) navigate({ to: target, replace: true });
    else toast.success("Check your email to confirm your account");
  };

  const google = async () => {
    if (target !== "/") sessionStorage.setItem("tensora-after-auth", target);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) return toast.error(res.error.message ?? "Google sign-in failed");
    if (res.redirected) return;
    navigate({ to: target, replace: true });
  };

  const forgot = async () => {
    if (!email) return toast("Enter your email first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent");
  };

  return (
    <div className="tech-grid grid min-h-screen place-items-center bg-background p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-2xl">
        <Wordmark />
        <h1 className="mt-6 text-lg font-semibold">Quality control, from any camera</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your plant workspace.</p>

        <Button variant="outline" className="mt-5 h-11 w-full" onClick={google}>Continue with Google</Button>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-3 pt-2">
              <div><Label htmlFor="e1">Work email</Label><Input id="e1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11" /></div>
              <div><Label htmlFor="p1">Password</Label><Input id="p1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11" /></div>
              <Button type="submit" className="h-11 w-full" disabled={busy}>Sign in</Button>
              <button type="button" onClick={forgot} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">Forgot password?</button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-3 pt-2">
              <div><Label htmlFor="n2">Full name</Label><Input id="n2" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-11" /></div>
              <div><Label htmlFor="e2">Work email</Label><Input id="e2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11" /></div>
              <div><Label htmlFor="p2">Password</Label><Input id="p2" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11" /></div>
              <Button type="submit" className="h-11 w-full" disabled={busy}>Create account</Button>
              <p className="text-center text-xs text-muted-foreground">New accounts start as Field Inspector. A Plant Admin can change your role.</p>
            </form>
          </TabsContent>
        </Tabs>
        <p className="mt-6 text-center font-mono text-[10px] text-muted-foreground">© Araneid Industrial Systems · <Link to="/verify/$certId" params={{ certId: "QAC-2026-0031" }} className="hover:text-foreground">Verify a certificate</Link></p>
      </div>
    </div>
  );
}
