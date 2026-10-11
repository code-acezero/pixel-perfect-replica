# Tensora by Araneid — Textile Quality Intelligence Platform

Tensora is the product; Araneid is the parent brand (endorsement only: "Tensora — an Araneid platform"). Multi-page, enterprise-style console with collapsible sidebar, persistent command bar, and tabbed sub-views. Runs on a simulated factory stream (optional webcam); session data only.

## Branding & naming system
- Wordmark: **TENSORA** with a small "by ARANEID" endorsement; footer "© Araneid Industrial Systems".
- Modules use a consistent industrial naming convention (Tensora + function):
  - **Tensora Command** — operations overview
  - **Tensora Vision** — live optical inspection
  - **Tensora Triage** — defect ledger / human-in-the-loop review
  - **Tensora Trace** — rolls, lots & traceability
  - **Tensora Asset** — lines & machine health
  - **Tensora Insight** — factory intelligence & root-cause
  - **Tensora Certify** — buyer compliance certificates
  - **Tensora Analytics** — reports
  - **System Configuration** — settings
- IDs follow plant conventions: `ASH-U03-L04` (line), `TX-8829` (roll), `DF-000123` (defect), `QAC-2026-0001` (certificate).

## App shell
- **Sidebar** (collapses to icons), grouped: Operations (Command, Vision, Triage), Production (Trace, Asset), Intelligence (Insight, Analytics), Compliance (Certify), System (Configuration).
- **Command bar**: site selector "Ashulia Mill — Unit 03 | Line #04 (Circular Knit)", active roll "Roll #TX-8829 | 100% Combed Cotton Single Jersey (180 GSM)", Live Camera / Simulated Stream toggle, alerts, shift + operator.
- Breadcrumbs and page header with actions on every page.

## Modules
1. **Command** (`/`) — KPIs (rolls inspected, pass rate, avg pts/100 yd², scrap avoided), line status grid, alert feed, trends. Tabs: Shift / Today / 7 Days.
2. **Vision** (`/vision`) — tabs:
   - *Inspection Station*: 16:9 scanning feed, bounding boxes with class + confidence, cyan HUD (Speed 42 m/min, 4K 60fps Edge-Sync, Inference 18 ms); Pause Inspection, Log Manual Flaw, Snapshot; ASTM D5430 4-point gauge, PASS/REJECT at 24.0, severity breakdown (seed: 142.5 m, 60 in, 18 pts).
   - *Telemetry*: speed, latency, FPS charts.
   - *Camera Diagnostics*: focus, exposure, lighting uniformity, calibration.
3. **Triage** (`/triage`) — tabs: Pending Review / Confirmed / Dismissed / All. Filterable ledger (timestamp, meter mark, class, severity, confidence, thumbnail), Confirm / Reclassify / Dismiss, bulk actions, detail drawer.
4. **Trace** (`/trace`, `/trace/$rollId`) — roll register; roll detail tabs: Summary / Defect Map / Audit Trail.
5. **Asset** (`/assets`, `/assets/$lineId`) — machine cards; detail tabs: Health / Needle & Cylinder Map / Maintenance Log.
6. **Insight** (`/insight`) — tabs: Active Alerts (incl. "Tensora Cluster Alert: 3 needle line defects within 15 m on Line #04 → Inspect Needle #142 on Cylinder Head 2. Estimated scrap saved: $380") / Root-Cause Patterns / Recommendations.
7. **Certify** (`/certify`, `/certify/$certId`) — issued register; certificate "ARANEID QUALITY AUDIT CERTIFICATE — Powered by Tensora" with lot summary, defect coordinate table, SHA-256 hash + QR, print/PDF.
8. **Analytics** (`/analytics`) — tabs: Quality Trends / Defect Pareto / Buyer Compliance; CSV export.
9. **Configuration** (`/configuration`) — tabs: Inspection Thresholds / Defect Taxonomy / Camera Fleet / Users & Roles.

## Design
Slate-950/900 surfaces, slate-800 borders; emerald (pass), amber (minor), crimson (major/reject), cyan (telemetry) as semantic tokens. Dense data tables, JetBrains Mono for telemetry/IDs, technical sans for headings.

## Technical details
- One route file per module with its own head() metadata ("Tensora Vision — Araneid" etc.); tabs bound to `?tab=` search param.
- Shared client store seeded with realistic mock rolls, lines, defects; simulation ticks update all modules.
- shadcn sidebar/tabs/table/dialog/sheet/select/switch; recharts; `qrcode` + Web Crypto.
- No backend this phase (resets on reload); Lovable Cloud can add persistence and logins later.
