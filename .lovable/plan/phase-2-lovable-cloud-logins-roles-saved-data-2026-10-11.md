# Phase 2 — Lovable Cloud: logins, roles, saved data

Lovable Cloud is now connected. This phase makes Tensora a real multi-user system: people sign in, see data for their organisation, and everything they inspect, review and certify is saved and synced across devices.

## What users get

- **Sign in page** (`/auth`): email + password and Google. Password reset page.
- **Everything behind sign-in**: all 10 modules require an account; Buyer Auditor gets read-only access.
- **Real roles**: Field Inspector, QC Lead, Quality Manager, Plant Admin, Buyer Auditor. First user becomes Plant Admin; admins assign roles in Configuration → Users & Roles. The demo role-switcher is removed.
- **Saved data**: rolls, buyers/standards, inspection sessions, defects, certificates, devices, alerts persist and survive reloads.
- **Defect photos**: crops captured during inspection are stored in Cloud file storage and shown in Triage, Trace and certificates.
- **Live sync**: a defect detected on a phone in the inspection area appears instantly in Triage on a desktop.
- **Public certificate check**: anyone scanning a certificate QR opens a read-only verification page (no sign-in), showing verdict and hash only.
- **Starter data**: the current sample rolls, buyers, devices and certificates are loaded once so the app isn't empty.

## Who can do what

| Action | Inspector | QC Lead | Quality Mgr | Plant Admin | Buyer Auditor |
|---|---|---|---|---|---|
| Run inspections, log flaws | yes | yes | yes | yes | no |
| Confirm / reclassify / dismiss | no | yes | yes | yes | no |
| Edit buyer standards, issue certificates | no | no | yes | yes | no |
| Devices, configuration, users | no | no | no | yes | no |
| View rolls & certificates | yes | yes | yes | yes | yes |

## Technical details

- Tables: `profiles`, `user_roles` (enum `app_role`, `has_role()` security-definer), `buyers`, `rolls`, `sessions`, `defects`, `certificates`, `devices`, `alerts`; all with GRANTs + RLS by role. Seed rows inserted in the migration.
- Storage bucket `defect-crops` (private, signed URLs).
- Realtime on `defects`, `alerts`, `sessions`.
- Zustand store keeps only UI state (stream mode, paused, active roll/session); data moves to TanStack Query with server functions (`requireSupabaseAuth`) and mutations; scoring stays in `scoring.ts`.
- Routes move under `_authenticated/`; public `/auth`, `/reset-password`, `/verify/$certId`.
- `onAuthStateChange` wired once in `__root`; bearer middleware in `src/start.ts`.
- AGENTS.md updated (store no longer holds data).
