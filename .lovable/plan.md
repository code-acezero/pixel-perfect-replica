# Araneid / Tensora — Textile QA Console

A single-screen, dark industrial dashboard built exactly to the brief, running on a simulated factory stream (with optional webcam).

## What gets built
1. **Header**: "ARANEID / Tensora" mark, facility + roll info, toggle between Live Camera Feed and Simulated Factory Stream.
2. **Optical Inspection Station (left)**: 16:9 animated fabric-scanning feed (procedural knit texture scrolling), canvas overlay drawing labeled defect boxes with confidence, cyan telemetry HUD (speed, camera, inference ms). Buttons: Pause Inspection, Log Manual Flaw, Snapshot (downloads PNG).
3. **ASTM D5430 4-Point Meter (right)**: radial gauge of points/100 sq yd using the given formula, PASS (green) / pulsing REJECT (red) badge at 24.0, metrics (length, width, total points, 1–4 pt breakdown) updating live.
4. **Defect Ledger + HITL triage**: table with timestamp, meter mark, class, severity, confidence, thumbnail crop captured from the feed; Confirm / Reclassify (dropdown) / Dismiss — dismissed items drop out of the score.
5. **Factory Intelligence card**: cluster alert (e.g. 3 needle lines within 15 m → inspect Needle #142), recomputed from ledger data.
6. **Certificate modal**: "ARANEID QUALITY AUDIT CERTIFICATE — Powered by Tensora" with lot summary, defect coordinate table, SHA-256 hash + QR code, print/save as PDF.

Seeded with the brief's starting values (142.5 m, 60 in, 18 pts: 3×1, 4×2, 1×3, 1×4).

## Design
Slate-950/900 surfaces, slate-800 borders; emerald/amber/crimson/cyan as semantic tokens; monospace telemetry type (JetBrains Mono) with a technical sans for headings.

## Technical details
- Index route rewritten; state in a React store (no backend — data lives in the session).
- Simulated detections are generated randomly; webcam via getUserMedia with simulated boxes overlaid (no real ML model).
- `qrcode` package for the QR; Web Crypto for the hash; shadcn dialog/table/select/switch.
