import path from "node:path";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => {
  const isBuild = command === "build";

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    server: {
      port: 8080,
      host: true,
      watch: {
        ignored: ["**/.vercel/**", "**/.output/**", "**/dist/**"],
      },
    },
    plugins: [
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tailwindcss(),
      tanstackStart({
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
      }),
      isBuild &&
        nitro({
          preset: process.env.NITRO_PRESET || "vercel",
        }),
      viteReact(),
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: {
          name: "Tensora by Araneid",
          short_name: "Tensora",
          description: "Camera-first fabric inspection — works offline.",
          start_url: "/capture",
          display: "standalone",
          background_color: "#020617",
          theme_color: "#020617",
          icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,woff2,png,svg,ico}"],
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "tensora-pages", networkTimeoutSeconds: 4, expiration: { maxEntries: 40 } },
            },
            {
              urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/assets/"),
              handler: "CacheFirst",
              options: { cacheName: "tensora-assets", expiration: { maxEntries: 300 } },
            },
            {
              urlPattern: ({ url }) => url.origin.startsWith("https://fonts."),
              handler: "StaleWhileRevalidate",
              options: { cacheName: "tensora-fonts" },
            },
          ],
        },
      }),
    ].filter(Boolean),
  };
});
