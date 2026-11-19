# Tensora Architecture & Development Guidelines

## Architecture rules
- Tensora app state lives in a single zustand store (`src/lib/tensora/store.ts`) seeded from deterministic data in `data.ts` — hydrated from Supabase Cloud after sign-in by `CloudSync` and written through via `cloud.ts`; seeds are only pre-hydration placeholders; never use Math.random at module scope.
- Never return freshly filtered/mapped arrays from a zustand selector; select raw state and derive outside — new references cause infinite re-render.
- Each module is its own route with its own head(); in-page tabs are bound to the `?tab=` search param via `tabSearch`.
- Scoring math (4-point, 10-point, Graniteville) lives only in `scoring.ts`.

- All modules live under `src/routes/_authenticated/`; only /auth, /reset-password, /verify/$certId are public — why: plant data is private, certificates must be verifiable by buyers.
- Role checks in UI use `useCan()`; database policies (`has_any_role`) are the real boundary.

- AI calls (frame detection, roll reports) go through `ai.server.ts` wrapped by auth-protected server fns in `ai.functions.ts` — why: keys stay server-side and only signed-in users spend credits.
- AI 'training' is few-shot: verified photos in `training_examples` (uploads + DB trigger on Triage confirm) are sent as reference images in analyzeFrame.
- ERP/MES pushes (SAP, FastReact, generic) go through `integrations.functions.ts`: HMAC-signed POSTs to admin-managed `integration_endpoints`, logged in `integration_deliveries`, fired after a certificate saves — why: secrets stay server-side and every delivery is auditable.
- Offline: all store writes go through `offline.ts` `write()` — run now or queue in IndexedDB outbox, replayed in order on reconnect; last cloud snapshot cached per user for offline start — why: inspectors work in dead zones. The service worker (vite-plugin-pwa generateSW) registers only via `pwa-register.ts`, never in dev/preview.
