# Tensora by Araneid — Textile Quality Intelligence Platform

Tensora is the product; Araneid is the parent brand ("Tensora — an Araneid platform"). An enterprise, multi-module console benchmarked against leading systems (Uster Fabriq Vision 2, Smartex CORE/FACT, 4-point inspection suites). Fully responsive: desktop control room, tablet at the inspection frame, phone for supervisors on the floor.

## Research-driven upgrades (what leaders do that we adopt)
- **Stop-at-source**: most knit defects originate at the knitting machine, so leaders detect on-machine and can halt it. Tensora adds a "Stop Machine" interlock action and machine-level alerts.
- **Automatic roll grading**: per-buyer quality standards (points per defect, grade bands A/B/Reject) applied automatically when a roll closes.
- **Multi-standard scoring per buyer**: 4-point (ASTM D5430), 10-point, Graniteville 78; each buyer profile selects its system, limit and unit (100 yd² or 100 m²).
- **Roll map + cut plan**: defects plotted along roll length, colored by points, with suggested cut positions to maximize first-quality yield.
- **Secondary tests** on each roll: GSM, width, bow/skew, shade (ΔE), shrinkage.
- **Style/article setup**: per-fabric inspection recipes (sensitivity, defect classes) to reduce over-detection.
- **Productivity**: RPM, stops, downtime reasons, OEE per machine.
- **Evidence-grade reporting**: buyer-format reports with roll header, defect table + photos, roll map, verdict, signature lines and audit log; debit/claim notes.
- **Traceability**: yarn lot → knitting machine → greige roll → dye lot → finished roll → buyer PO.

## Branding & naming
- Wordmark **TENSORA**, endorsement "by ARANEID", footer "© Araneid Industrial Systems".
- Modules: Tensora Command, Vision, Triage, Trace, Grade, Asset, Insight, Certify, Analytics, plus System Configuration.
- Plant ID conventions: line `ASH-U03-L04`, roll `TX-8829`, defect `DF-000123`, certificate `QAC-2026-0001`, buyer `BYR-HM-01`.

## App shell (responsive)
- **Desktop**: grouped collapsible sidebar (Operations / Production / Quality / Intelligence / Compliance / System), command bar with site, active roll, Live/Simulated toggle, alerts, shift + operator, global search (Cmd+K).
- **Tablet**: icon rail sidebar, large touch targets for the inspection frame.
- **Phone**: bottom tab bar (Command, Vision, Triage, Alerts, More), condensed header, tables turn into stacked cards, swipe actions in Triage (confirm/dismiss), sheets instead of dialogs.
- Breadcrumbs, page headers with actions, empty/loading/error states everywhere.

## Modules
1. **Command** (`/`) — plant KPIs (first-quality %, avg pts/100 yd², rolls graded, OEE, scrap avoided $), line status grid, live alert feed, trends. Tabs: Shift / Today / 7 Days / 30 Days.
2. **Vision** (`/vision`) — tabs: *Inspection Station* (16:9 feed, labeled boxes + confidence, cyan HUD, Pause / Log Manual Flaw / Snapshot / Stop Machine, live ASTM gauge with PASS ≤ 24 / pulsing REJECT, severity breakdown; seed 142.5 m, 60 in, 18 pts), *Multi-Camera Wall* (all lines), *Telemetry*, *Camera Diagnostics*.
3. **Triage** (`/triage`) — tabs: Pending Review / Confirmed / Reclassified / Dismissed. Filters, bulk actions, detail drawer with image crop and history; reviewer decisions feed a "model feedback" counter.
4. **Trace** (`/trace`, `/trace/$rollId`) — roll register; roll detail tabs: Summary / Roll Map & Cut Plan / Secondary Tests / Genealogy / Audit Trail.
5. **Grade** (`/grade`) — buyer quality standards: scoring system, limits, grade bands; roll grading queue and results.
6. **Asset** (`/assets`, `/assets/$lineId`) — machine fleet; detail tabs: Health & OEE / Needle & Cylinder Map / Stops & Downtime / Maintenance Log.
7. **Insight** (`/insight`) — tabs: Active Alerts (cluster alert: 3 needle lines within 15 m on Line #04 → inspect Needle #142, Cylinder Head 2, est. $380 saved) / Root-Cause Patterns / Recommendations / Predictive Maintenance.
8. **Certify** (`/certify`, `/certify/$certId`) — certificate register; "ARANEID QUALITY AUDIT CERTIFICATE — Powered by Tensora" with lot summary, roll map, defect coordinate table, SHA-256 hash + QR, signature lines, print/PDF; claim/debit note view.
9. **Analytics** (`/analytics`) — tabs: Quality Trends / Defect Pareto / Supplier & Yarn Scorecards / Buyer Compliance / Cost of Poor Quality; CSV export.
10. **Configuration** (`/configuration`) — tabs: Inspection Recipes (by article) / Defect Taxonomy / Camera Fleet / Integrations (ERP, MES, webhooks — placeholders) / Users & Roles / Audit Log.

## Roles (visual, role-switcher demo)
Operator, QC Inspector, Shift Supervisor, Quality Manager, Plant Admin, Buyer Auditor (read-only certificate portal). Navigation adapts per role.

## Design
Slate-950/900 surfaces, slate-800 borders; emerald (pass), amber (minor), crimson (major/reject), cyan (telemetry) as semantic tokens. Dense tables on desktop, cards on mobile; JetBrains Mono for telemetry/IDs, technical sans for headings; high-contrast for factory lighting.

## Phasing (long term)
- **Phase 1 (this build)**: full shell, all modules with realistic simulated data, responsive layouts, certificates.
- **Phase 2**: Lovable Cloud — logins and roles, persistent rolls/defects/certificates, photo storage, real multi-user triage.
- **Phase 3**: AI-assisted defect explanations and reports, buyer portal, ERP/MES integrations, offline mode for tablets.

## Technical details
- One route file per module with own head() ("Tensora Vision — Araneid"); tabs bound to `?tab=` search param.
- Shared client store seeded with mock plant data (lines, rolls, buyers, defects); simulation ticks update all modules; scoring engine supports 4-point/10-point/Graniteville.
- shadcn sidebar, tabs, table, sheet, drawer, command, select, switch; recharts; `qrcode` + Web Crypto; `useIsMobile` for bottom-nav and card layouts.
