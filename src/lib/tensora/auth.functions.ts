import { createServerFn } from "@tanstack/react-start";
import "@/integrations/supabase/dns";

export interface GoogleAuthCheckResult {
  enabled: boolean;
  error?: string;
}

export const checkGoogleOAuthStatus = createServerFn({ method: "POST" })
  .handler(async (): Promise<GoogleAuthCheckResult> => {
    try {
      const supabaseUrl = process.env["SUPABASE_URL"] || "https://mgjqyymqhsxnwkuqskfi.supabase.co";
      const cleanUrl = supabaseUrl.replace(/\/+$/, "");

      const res = await fetch(`${cleanUrl}/auth/v1/authorize?provider=google`, {
        redirect: "manual",
      });

      // If Supabase returns HTTP 400 with "Unsupported provider: provider is not enabled"
      if (res.status === 400) {
        const json = (await res.json().catch(() => ({}))) as { msg?: string; error_code?: string };
        if (json.msg?.includes("not enabled") || json.error_code === "validation_failed") {
          return {
            enabled: false,
            error: "Google Provider is not enabled in your Supabase project (Authentication > Providers > Google).",
          };
        }
      }

      // If Supabase redirects (302 / 303) to accounts.google.com, Google provider is enabled!
      if (res.status === 302 || res.status === 303) {
        return { enabled: true };
      }

      return { enabled: true };
    } catch (err: unknown) {
      console.warn("[Auth] Failed to check Google OAuth status:", err);
      return { enabled: false, error: "Unable to reach Supabase authentication service." };
    }
  });
