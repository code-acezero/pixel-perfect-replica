# Tensora by Araneid — Camera-First Textile Quality Intelligence

Tensora is the product; Araneid is the parent brand ("Tensora — a Quality Vision engine from Araneid"). Tensora turns **any camera** — phone, tablet, laptop webcam, USB/IP camera over a fabric table — into an AI fabric inspection station. No fixed machine hardware required: inspect at the knitting line, the inspection table, the warehouse, the dye house, or the buyer's office. Fully responsive: phone/tablet are first-class inspection devices, desktop is the control room.

## Positioning vs legacy systems
- Legacy (Uster, Smartex, frame-mounted systems): fixed cameras bolted to machines or inspection frames, expensive, one location.
- Tensora: **portable, device-agnostic, inspect anywhere, anytime**. Any camera + browser = inspection station. Scales from one QC inspector with a phone to a full mill with many cameras.
- Kept from industry best practice: per-buyer scoring (4-point ASTM D5430, 10-point, Graniteville 78), automatic roll grading, roll map + cut plan, evidence-grade buyer reports, traceability.

## Core concept: Inspection Sessions
Every inspection is a **session**: pick camera → pick roll/lot (scan barcode/QR or type) → pick buyer standard → inspect → review → grade → certify. Sessions can run on any device and location, and are tagged with site, location, device, inspector.

## Branding & naming
- Wordmark **TENSORA**, endorsement "by ARANEID", footer "© Araneid Industrial Systems".
- Modules: Tensora Command, Capture, Triage, Trace, Grade, Insight, Certify, Analytics, Devices, plus System Configuration.
- ID conventions: site `ASH-U03`, session `INS-2026-000418`, roll `TX-8829`, defect `DF-000123`, device `CAM-PH-07`, certificate `QAC-2026-0001`, buyer `BYR-HM-01`.

## App shell (responsive)
- **Desktop**: grouped collapsible sidebar (Inspect / Quality / Intelligence / Compliance / System), command bar with site & location, active session/roll, Live Camera / Simulated Stream toggle, alerts, inspector, global search (Cmd+K).
- **Tablet**: icon rail; Capture runs full-screen with large touch controls.
- **Phone**: bottom tab bar (Command, Capture, Triage, Alerts, More); Capture uses rear camera full-screen, big shutter-style buttons, haptic-style flash on detection; tables become cards; swipe to confirm/dismiss; sheets instead of dialogs.

## Modules
1. **Command** (`/`) — KPIs (sessions today, first-quality %, avg pts/100 yd², rolls graded, scrap avoided $), active sessions across sites/devices, alert feed, trends. Tabs: Live / Today / 7 Days / 30 Days.
2. **Capture** (`/capture`) — the inspection station. Tabs:
   - *Live Inspection*: 16:9 feed (device camera via browser or simulated stream), labeled boxes (Needle Line, Oil Stain, Hole, Warp Float…) + confidence, cyan HUD (scan speed, camera resolution/fps, inference ms, lighting/focus quality), Pause Inspection / Log Manual Flaw / Snapshot / End Session; live ASTM gauge PASS ≤ 24 / pulsing REJECT, severity breakdown (seed 142.5 m, 60 in, 18 pts). Meter tracking via manual meter mark, roll counter entry, or estimated scan speed.
   - *Session Setup*: choose camera (front/rear/USB/IP), roll/lot via barcode-QR scan, buyer standard, fabric width, location.
   - *Capture Quality*: lighting, focus, motion blur, distance guidance with on-screen tips ("Move closer", "Add light").
3. **Triage** (`/triage`) — tabs: Pending Review / Confirmed / Reclassified / Dismissed. Filters, bulk actions, detail drawer with crop + history; reviewer decisions feed a "model feedback" counter (human-in-the-loop learning).
4. **Trace** (`/trace`, `/trace/$rollId`) — roll & lot register; roll tabs: Summary / Roll Map & Cut Plan / Sessions (all inspections of this roll, any location) / Secondary Tests (GSM, width, bow/skew, shade ΔE) / Audit Trail.
5. **Grade** (`/grade`) — buyer quality standards (scoring system, limits, units, grade bands A/B/Reject); auto-grading queue and results.
6. **Insight** (`/insight`) — tabs: Active Alerts (cluster alert: 3 needle lines within 15 m on Line #04 → inspect Needle #142, Cylinder Head 2, est. $380 saved) / Root-Cause Patterns (by line, yarn lot, supplier, shift) / Recommendations.
7. **Certify** (`/certify`, `/certify/$certId`) — certificate register; "ARANEID QUALITY AUDIT CERTIFICATE — Powered by Tensora" with lot summary, roll map, defect coordinate table, inspection device + location, SHA-256 hash + QR verification, signature lines, print/PDF, share link.
8. **Analytics** (`/analytics`) — tabs: Quality Trends / Defect Pareto / Supplier & Yarn Scorecards / Buyer Compliance / Cost of Poor Quality; CSV export.
9. **Devices** (`/devices`) — registered cameras and phones/tablets: status, last session, calibration, capture quality score; "Add device" pairing via QR (scan with a phone to turn it into a Tensora camera).
10. **Configuration** (`/configuration`) — tabs: Inspection Recipes (by fabric/article) / Defect Taxonomy / Sites & Locations / Integrations (ERP, webhooks — placeholders) / Users & Roles / Audit Log.

## Roles (role-switcher demo)
Field Inspector, QC Lead, Quality Manager, Plant Admin, Buyer Auditor (read-only certificate view). Navigation adapts per role; Field Inspector on phone lands directly in Capture.

## Design
Slate-950/900 surfaces, slate-800 borders; emerald (pass), amber (minor), crimson (major/reject), cyan (telemetry/camera) as semantic tokens. Dense tables on desktop, cards on mobile; JetBrains Mono for telemetry/IDs, technical sans for headings; high contrast for factory and outdoor lighting.

## Phasing
- **Phase 1 (this build)**: full shell, all modules, real browser camera access + simulated stream, simulated AI detections, responsive layouts, certificates.
- **Phase 2**: Lovable Cloud — logins and roles, persistent sessions/rolls/defects/certificates, snapshot storage, multi-device sync.
- **Phase 3**: real AI defect detection on camera frames, AI-written reports, buyer portal, offline mode with sync, ERP integrations.

## Technical details
- One route file per module with own head() ("Tensora Capture — Araneid"); tabs bound to `?tab=` search param.
- Camera via `getUserMedia` with device picker (facingMode environment on phones), started only after user action; simulated detections overlaid on canvas.
- Shared client store seeded with mock sites, rolls, buyers, devices, sessions, defects; scoring engine supports 4-point/10-point/Graniteville.
- shadcn sidebar, tabs, table, sheet, drawer, command, select, switch; recharts; `qrcode` + Web Crypto; `useIsMobile` for bottom-nav and card layouts.
