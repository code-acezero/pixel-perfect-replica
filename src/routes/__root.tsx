import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  isRedirect,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { useTensora } from "@/lib/tensora/store";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-mono text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Module not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This Tensora page doesn't exist or has been moved.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to Command
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  if (isRedirect(error)) {
    throw error;
  }
  console.error("Root error boundary caught error:", error);
  const router = useRouter();

  const errorMessage = error instanceof Error ? error.message : String(error || "");
  const isChunkOrNetworkError =
    errorMessage.includes("dynamically imported module") ||
    errorMessage.includes("Failed to fetch") ||
    errorMessage.includes("Loading chunk") ||
    errorMessage.includes("404");

  useEffect(() => {
    reportError(error, { boundary: "tanstack_root_error_component" });

    // Auto-reload once if this is a deployment chunk mismatch error
    if (typeof window !== "undefined" && isChunkOrNetworkError) {
      const reloaded = sessionStorage.getItem("tensora_auto_chunk_reload");
      if (!reloaded) {
        sessionStorage.setItem("tensora_auto_chunk_reload", "1");
        window.location.reload();
      }
    }
  }, [error, isChunkOrNetworkError]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isChunkOrNetworkError
            ? "Tensora was updated with a new deployment. Reload the application to get the latest version."
            : "Something went wrong. You can reload or head back."}
        </p>
        {errorMessage && (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground/80 max-h-24 overflow-auto rounded bg-surface-2 p-2 border border-border text-left">
            {errorMessage}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("tensora_auto_chunk_reload");
                window.location.reload();
              }
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reload application
          </button>
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#020617" },
      { title: "Tensora by Araneid — Camera-First Textile Quality Intelligence" },
      { name: "description", content: "Turn any camera into an AI fabric inspection station. ASTM D5430 grading, triage, traceability and buyer certificates." },
      { name: "author", content: "Araneid Industrial Systems" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Hind+Siliguri:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    void import("@/lib/tensora/pwa-register").then((m) => m.registerTensoraSW());

    // Listen for Vite dynamic import preload failures (new deployment asset hashes)
    const handlePreloadError = () => {
      const reloaded = sessionStorage.getItem("tensora_preload_reload");
      if (!reloaded) {
        sessionStorage.setItem("tensora_preload_reload", "1");
        window.location.reload();
      }
    };
    window.addEventListener("vite:preloadError", handlePreloadError);
    return () => {
      window.removeEventListener("vite:preloadError", handlePreloadError);
    };
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") useTensora.getState().reset();
      void router.invalidate();
      if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
      if (event === "SIGNED_IN") {
        const next = sessionStorage.getItem("tensora-after-auth");
        if (next) {
          sessionStorage.removeItem("tensora-after-auth");
          void router.navigate({ to: next, replace: true });
        } else if (window.location.pathname === "/auth") {
          void router.navigate({ to: "/", replace: true });
        }
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
