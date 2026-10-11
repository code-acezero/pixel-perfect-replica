import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/tensora/brand";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Tensora by Araneid" },
      { name: "description", content: "Choose a new password for your Tensora account." },
      { property: "og:title", content: "Reset password — Tensora" },
      { property: "og:description", content: "Set a new Tensora password." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/", replace: true });
  };
  return (
    <div className="tech-grid grid min-h-screen place-items-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-surface p-6">
        <Wordmark />
        <h1 className="text-lg font-semibold">Set a new password</h1>
        <div><Label htmlFor="pw">New password</Label><Input id="pw" type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1.5 h-11" /></div>
        <Button type="submit" className="h-11 w-full">Update password</Button>
      </form>
    </div>
  );
}
