<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Tensora app state lives in a single zustand store (`src/lib/tensora/store.ts`) seeded from deterministic data in `data.ts` — hydrated from Lovable Cloud after sign-in by `CloudSync` and written through via `cloud.ts`; seeds are only pre-hydration placeholders; never use Math.random at module scope (Workers forbid it).
- Never return freshly filtered/mapped arrays from a zustand selector; select raw state and derive outside — new references cause infinite re-render.
- Each module is its own route with its own head(); in-page tabs are bound to the `?tab=` search param via `tabSearch`.
- Scoring math (4-point, 10-point, Graniteville) lives only in `scoring.ts`.

- All modules live under `src/routes/_authenticated/`; only /auth, /reset-password, /verify/$certId are public — why: plant data is private, certificates must be verifiable by buyers.
- Role checks in UI use `useCan()`; database policies (`has_any_role`) are the real boundary.
