# Araneid / Tensora — Industrial Textile QA Platform

A multi-page, enterprise-style console with a collapsible sidebar, persistent top bar, and tabbed sub-views on every major page. Runs on a simulated factory stream (optional webcam), session data only.

## App shell
- **Sidebar** (collapses to icon strip): Overview, Live Inspection, Defect Ledger, Rolls & Lots, Lines & Machines, Factory Intelligence, Certificates, Reports, Settings.
- **Top bar**: "ARANEID / Tensora" mark, facility selector ("Ashulia Mill — Unit 03 | Line #04 (Circular Knit)"), active roll ("Roll #TX-8829 | 100% Combed Cotton Single Jersey (180 GSM)"), Live Camera / Simulated Stream toggle, alert bell, operator menu.
- Breadcrumbs and page header with actions on every page.

## Pages
1. **Overview** (`/`) — KPI tiles (rolls inspected, pass rate, avg pts/100 yd², scrap saved), per-line status grid, recent alerts, trend charts. Tabs: Today / Shift / 7 days.
2. **Live Inspection** (`/inspection`) — tabs:
   - *Station*: 16:9 scanning feed + bounding box canvas + cyan HUD; Pause, Log Manual Flaw, Snapshot; ASTM D5430 4-point gauge with PASS/REJECT badge at 24.0 and severity breakdown (seed: 142.5 m, 60 in, 18 pts).
   - *Telemetry*: speed, inference latency, FPS charts.
   - *Camera Diagnostics*: focus, exposure, lighting uniformity, calibration status.
3. **Defect Ledger** (`/defects`) — tabs: Pending Triage / Confirmed / Dismissed / All. Filterable table (timestamp, meter mark, class, severity, confidence, thumbnail), Confirm / Reclassify / Dismiss, bulk actions, defect detail drawer.
4. **Rolls & Lots** (`/rolls`, `/rolls/$rollId`) — roll list with status; roll detail with tabs: Summary / Defect Map (defects plotted along length × width) / Audit History.
5. **Lines & Machines** (`/lines`, `/lines/$lineId`) — machine cards; detail tabs: Health / Needle & Cylinder Map / Maintenance Log.
6. **Factory Intelligence** (`/intelligence`) — tabs: Active Alerts (incl. "3 needle line defects within 15 m → inspect Needle #142 on Cylinder Head 2, est. scrap saved $380") / Root-Cause Patterns / Recommendations.
7. **Certificates** (`/certificates`, `/certificates/$id`) — issued list; certificate view "ARANEID QUALITY AUDIT CERTIFICATE — Powered by Tensora" with lot summary, defect coordinate table, SHA-256 hash + QR, print/save PDF.
8. **Reports** (`/reports`) — tabs: Quality Trends / Defect Pareto / Buyer Compliance; CSV export.
9. **Settings** (`/settings`) — tabs: Inspection Thresholds (ASTM limit, severity rules) / Defect Classes / Cameras / Users & Roles (display only).

## Design
Slate-950/900 surfaces, slate-800 borders, emerald/amber/crimson/cyan as semantic tokens; dense data tables, JetBrains Mono for telemetry, a technical sans for headings. Status colors used consistently across all pages.

## Technical details
- Separate TanStack route files per page with own head() metadata; tabs via shadcn Tabs bound to `?tab=` search param so tabs are linkable.
- Shared client store (Zustand-style React context) seeded with realistic mock rolls, lines, defects; live simulation ticks feed the store so all pages update together.
- shadcn sidebar, tabs, table, dialog, sheet, select, switch; recharts for charts; `qrcode` + Web Crypto for certificates.
- No backend in this phase (data resets on reload); Lovable Cloud can be added later for persistence and logins.
