# Tensora Fabric QA Platform — Operational Manual & Feature Guide

> **System Version:** 2.4.0 (Enterprise Edition)  
> **Target Industry:** Ready-Made Garment (RMG) & Textile Manufacturing  
> **Compliance Standards:** ASTM D5430 (4-Point Fabric Inspection), ASTM D3776 (Mass Per Unit Area / GSM), ASTM D3882 / ISO 16322 (Bow & Skew Spirality)  
> **Deployment Target:** Vercel Serverless / Cloudflare Edge + Supabase Enterprise Cloud  

---

## 1. System Overview & Architecture

**Tensora** is an industrial-grade Textile Quality Assurance (QA) Operating System and Automated Defect Triage Platform engineered specifically for the high-throughput knitting, dyeing, and finishing mills of Bangladesh (Ashulia, Gazipur, Narayanganj, Savar, Chattogram) and global apparel supply chains.

The platform bridges high-speed computer vision hardware, real-time edge processing, mill floor human-in-the-loop triage, automated grading calculations, thermal roll labeling, and cryptographic buyer audit verification.

```
+--------------------------------------------------------------------------------------------------+
|                                     TENSORA HARDWARE & CAMERAS                                   |
|   [Overhead 4K Stream]       [Backlight LED Table]       [Handheld Mobile Torch]     [RTSP Feeds] |
+--------------------------------------------------------------------------------------------------+
                                                 |
                                                 v
+--------------------------------------------------------------------------------------------------+
|                                  EDGE CLIENT (BROWSER / PWA)                                     |
|  * 60 FPS HTML5 Canvas HUD           * Bilingual Interface (EN / বাংলা)                          |
|  * Web Audio 1760Hz Floor Siren      * IndexedDB Offline Outbox Queue                            |
|  * Hardware Torch Constraint Control * 4"x6" Thermal Sticker Printing Engine                     |
+--------------------------------------------------------------------------------------------------+
                                                 |
                                                 v
+--------------------------------------------------------------------------------------------------+
|                                  STATE & DATA SYNCHRONIZATION                                    |
|   Zustand Store (Single Source of Truth)  <--->  CloudSync Write-Through / IndexedDB Replay      |
+--------------------------------------------------------------------------------------------------+
             |                                                                 |
             v                                                                 v
+------------------------------------+               +---------------------------------------------+
|    VERCEL SERVERLESS FUNCTIONS     |               |             SUPABASE CLOUD POSTGRES         |
|  * ai.functions.ts (Defect Vision) |               |  * Row-Level Security (has_any_role)        |
|  * integrations.functions.ts       |               |  * Realtime Websocket Replication           |
|    (HMAC SAP / FastReact Webhooks) |               |  * verify_certificate RPC Engine            |
+------------------------------------+               |  * DNS-over-HTTPS (DoH) Resilient Client    |
                                                     +---------------------------------------------+
```

---

## 2. Bangladeshi RMG Mill QA Standards & Mathematical Formulations

Tensora implements strict international quality control algorithms customized for major international fashion retailers (H&M, Inditex, Marks & Spencer, Primark, Target, PVH):

### 2.1. ASTM D5430 Standard (4-Point Fabric Grading System)

#### Cuttable Width Deduction ($W_{\text{cut}}$)
In standard Bangladeshi mill operations, fabric selvedges (edges) are often stretched, pin-holed by stenters, or wavy. Tensora calculates points using the true **Cuttable Width**:
$$W_{\text{cut}} = W_{\text{gross}} - 1.0\text{ inch}$$
*(Default edge allowance is 0.5 inches per side = 1.0 inch total).*

#### Point Penalty Allocation
Defects detected across the fabric web are scored according to their maximum linear dimension or area:
- **1 Point:** Flaws up to $3.0\text{ inches}$ ($75\text{ mm}$)
- **2 Points:** Flaws between $3.0\text{ inches}$ and $6.0\text{ inches}$ ($75\text{ mm} - 150\text{ mm}$)
- **3 Points:** Flaws between $6.0\text{ inches}$ and $9.0\text{ inches}$ ($150\text{ mm} - 230\text{ mm}$)
- **4 Points:** Flaws greater than $9.0\text{ inches}$ ($> 230\text{ mm}$), holes of any diameter $> 0.25"$, or continuous running lines.

> **Constraint:** Under ASTM D5430, no single linear yard ($0.9144\text{ m}$) may be penalized more than **4 points**, regardless of the number of flaws in that linear span.

#### Points per 100 Square Yards Calculation
Tensora calculates the standardized roll penalty score using the formula:
$$\text{Points per } 100\text{ yd}^2 = \frac{\text{Total Penalty Points} \times 3600}{\text{Inspected Linear Yards} \times W_{\text{cut}}}$$

Where:
$$\text{Inspected Linear Yards} = \text{Inspected Meters} \times 1.09361$$

#### Commercial Grade Classification Thresholds
- **Grade A (First Choice / Premium):** $\le 28.0 \text{ points / } 100\text{ yd}^2$ (Passing buyer shipment threshold)
- **Grade B (Second Quality / Concession):** $> 28.0\text{ and } \le 40.0 \text{ points / } 100\text{ yd}^2$ (Requires commercial markdown or buyer approval)
- **Grade C / Reject (Quarantined):** $> 40.0 \text{ points / } 100\text{ yd}^2$ OR rolls flagged with continuous structural faults.

---

### 2.2. Continuous Fault Immediate Quarantine Rule
Under buyer compliance contracts, continuous defects (such as broken needle lines, drop stitches, lycra jumps, or oil streaks) ruin entire garment cutting lays.
- **Rule:** If any single 4-point defect or continuous defect line persists for **$> 3.0\text{ meters}$**, Tensora instantly:
  1. Activates the **Mill Floor Acoustic Siren** (1760 Hz alternating tone).
  2. Overrides the roll grade to **Reject (Continuous Fault Quarantined)**.
  3. Displays a persistent red alarm banner on the operator HUD and traceability reports.

---

### 2.3. ASTM D3776 3-Point GSM Variance Verification
To detect uneven circular knitting tension, differential stenter feeding, or dye pad squeezing:
- Circular cutters extract three round samples ($100\text{ cm}^2$ each) across the fabric width: **Left Selvedge ($GSM_L$)**, **Center ($GSM_C$)**, and **Right Selvedge ($GSM_R$)**.
- Tensora calculates the cross-width variance:
  $$GSM_{\text{avg}} = \frac{GSM_L + GSM_C + GSM_R}{3}$$
  $$\Delta GSM_{\%} = \max\left(\frac{|GSM_L - GSM_C|}{GSM_{\text{avg}}}, \frac{|GSM_R - GSM_C|}{GSM_{\text{avg}}}\right) \times 100$$
- **Threshold:** If $\Delta GSM_{\%} > 5.0\%$, the roll is flagged for uneven weight distribution, risking shade variation in garment panels.

---

### 2.4. ASTM D3882 / ISO 16322 Bow & Skew Spirality Risk
Knitted fabrics (particularly single jersey) suffer from yarn torque causing spirality.
- **Formula:**
  $$\text{Skewness \%} = \frac{\text{Deflection Distance } (D)}{\text{Cuttable Width } (W)} \times 100$$
- **Threshold:** Knits exceeding **2.5%** are marked with a spirality warning, preventing cut garments from twisting after consumer laundering.

---

### 2.5. 5-Zone Cross-Width Spatial Zoning
Defects are automatically classified into one of 5 cross-width zones based on their normalized $X$-coordinate ($0.0 \le X \le 1.0$):
1. **Left Selvedge:** $X < 0.10$ *(indicates stenter clip damage or edge curling)*
2. **Left Body:** $0.10 \le X < 0.35$
3. **Center:** $0.35 \le X < 0.65$ *(indicates circular knitting cylinder or sinker ring damage)*
4. **Right Body:** $0.65 \le X < 0.90$
5. **Right Selvedge:** $X \ge 0.90$ *(indicates take-up roller friction or edge guide marks)*

---

## 3. Comprehensive Feature Walkthrough

### 3.1. Top Navigation & Bilingual Mode (EN / বাংলা)
The top navigation bar provides immediate system status and controls:
- **Mill Header:** Shows current Mill, Unit, Inspection Line, and Active Roll number (e.g. `Ashulia Mill — Unit 03 / Line #04 / Roll #TX-8829`).
- **Bilingual Toggle (`EN | বাং`):** Instantly switches the entire user interface, defect classifications, shift names, and inspection alerts between English and Bengali without page reload.
- **Offline / Sync Pill:** Displays real-time cloud synchronization status with queued mutation counter.
- **Quick Search (`Cmd+K` / `Ctrl+K`):** Instantly locate rolls, styles, certificates, or defect types.
- **Sim Stream Toggle:** Switch between live camera hardware feed and calibrated simulation test feed.

---

### 3.2. Live Inspection Station (`/capture`)
The heart of the operator's workspace.
- **Live Canvas HUD:** Renders high-frame-rate bounding boxes with confidence scores, defect category labels, and physical point penalties.
- **Stream Controls:**
  - `Play / Pause`: Start or stop fabric inspection feed.
  - `Inspect Frame`: Perform deep multi-head visual AI inference on the current frozen frame.
  - `Save Defect`: Manually log a detected flaw with custom classification and millimeter dimensions.
- **Floor Siren Toggle (`Volume2` / `VolumeX`):** Activates or mutes the mill floor Web Audio siren.
- **Device Fleet Switcher:** Seamlessly switch the active inspection viewport between paired devices:
  - `Overhead Table` (Wide-angle fixed ceiling camera)
  - `Backlight Panel` (Under-table illuminated inspection for holes & needle runs)
  - `Handheld Companion` (Mobile smartphone/tablet with hardware torch)
- **Roll Creation Modal:** Register new rolls with complete mill traceability: Roll Number, Style Code, Color, Composition, Construction, Shift (Shift A / B / C), Circular Knit Machine Number, Dye Batch, Yarn Count, Fabric Type, Gross Width, and Target GSM.
- **Thermal Label Print Button:** One-click launch of the 4" $\times$ 6" Roll Ticket sticker generator.

---

### 3.3. Industrial Acoustic Siren (Synthesized Web Audio API)
Designed for loud textile weaving and knitting sheds where operators cannot constantly look at the computer screen:
- **Frequency Modulation:** Alternates between $880\text{ Hz}$ and $1760\text{ Hz}$ in continuous 150ms alarm pulses.
- **Auto-Trigger Conditions:**
  - Detection of any 4-point penalty defect (e.g. hole $> 0.25"$, drop stitch).
  - Detection of a continuous fault streak ($> 3.0\text{ m}$).
  - Roll penalty score exceeding the buyer Grade A threshold.
- **Safety:** Synthesized entirely client-side using native HTML5 Web Audio API oscillators—requires zero external sound files or internet connection.

---

### 3.4. Defect Ledger & Triage (`/triage`)
The quality supervisor's audit desk:
- **Defect Review Cards:** Displays high-resolution captured crops of every flagged flaw with confidence scores, yardage location, and spatial zone.
- **One-Click Human Verification:**
  - `Confirm`: Validates AI prediction; marks defect as verified in the permanent audit record and automatically adds the crop to the few-shot visual memory bank.
  - `Reject`: Discards false positives, immediately recalculating the roll's ASTM D5430 penalty score.
- **Spatial Zone Breakdown:** Filter defects by Left Selvedge, Body, or Center to spot systemic mechanical faults on the knitting floor.

---

### 3.5. Roll Map & Linear Yard Density (`/grade`)
- **Interactive Yard-by-Yard Heatmap:** Visual representation of the full fabric roll length ($0\text{ to } 120+\text{ meters}$).
- **Spatial Clustering:** Color-coded flaw markers indicate exact meter points where defects cluster, warning the garment cutting master of unusable fabric zones.
- **Score Breakdown Card:** Live calculation of total points, inspected area, points per 100 sq yds, and current grade.

---

### 3.6. Traceability Ledger & Mill ERP Export (`/trace`)
- **Roll Register:** Searchable, sortable catalog of all mill inspection lots with real-time status badges (`Passed`, `Hold`, `In Inspection`, `Quarantined`).
- **Export Mill CSV:** One-click generation of a 27-column spreadsheet formatted for direct ingestion into mill enterprise systems:
  - **Supported ERPs:** SAP Apparel & Footwear (AFS), Coats Digital FastReact, Infor Fashion, Microsoft Dynamics 365 Textile.
  - **Exported Columns:** `Roll ID`, `Roll Number`, `Style`, `Color`, `Composition`, `Construction`, `Length (m)`, `Gross Width (in)`, `Cuttable Width (in)`, `Target GSM`, `GSM Left`, `GSM Center`, `GSM Right`, `GSM Variance %`, `Bow/Skew %`, `Shift`, `Machine No`, `Dye Batch`, `Yarn Count`, `Fabric Type`, `Defect Count`, `Total 4-Point Penalties`, `Points / 100 Sq Yd`, `Grade`, `Status`, `Continuous Fault Streak`, `Inspection Timestamp`.

---

### 3.7. Roll Inspection Detail & Compliance Scorecard (`/trace/$rollId`)
Comprehensive drill-down view for any individual fabric roll:
- **ASTM D5430 Scorecard:** Displays gross vs. cuttable width, point penalty rate, and Grade A threshold comparison.
- **ASTM D3776 3-Point GSM Gauge:** Visual comparison of Left, Center, and Right GSM disc cuts against the mill recipe target.
- **ASTM D3882 Bow & Skew Spirality Indicator:** Displays measured angular deflection with green/amber/red risk rating.
- **Continuous Fault Banner:** Displays warning if continuous streaks exceeded 3.0 meters.
- **5-Zone Spatial Defect Distribution:** Horizontal bar chart demonstrating the exact physical spread of defects across the roll width.
- **Audit Certificate Generator:** Generates the official cryptographic export certificate.

---

### 3.8. 4" $\times$ 6" Thermal Roll Ticket Sticker Generator
A dedicated print engine for industrial thermal label printers (Zebra, TSC, Honeywell, Godex):
- **High-Contrast Monochromatic Layout:** Formatted specifically for $203\text{ DPI}$ and $300\text{ DPI}$ direct thermal and thermal transfer adhesive rolls.
- **QR Code Verification:** Encodes direct URL to the public verification portal for rapid inspection by warehouse receiving teams.
- **Universal Code 128 Barcode:** Encodes the roll identifier for instant barcode scanner ingestion.
- **Specification Matrix:** Lists Roll Number, Batch, Shift, Machine, Style, Color, Composition, GSM metrics, and Cuttable Width.
- **Grade Badge & Stamp:** Prominent high-visibility box indicating `GRADE A (PASS)` or `HOLD / REJECT`.

---

### 3.9. Cryptographic Audit Certificate & Public Verification (`/verify/$certId`)
- **Tamper-Proof SHA-256 Hash:** Every finalized certificate generates a cryptographic digest derived from:
  $$\text{Hash} = \text{SHA256}(\text{CertNo} + \text{RollNo} + \text{PointsRate} + \text{Grade} + \text{DefectCount} + \text{Timestamp})$$
- **Public Buyer Verification Portal (`/verify/$certId`):**
  - Completely accessible without login or user account.
  - Allows overseas buyers, sourcing agents, and third-party QA inspectors (SGS, Intertek, Bureau Veritas) to scan the roll's QR code and verify that physical inspection data has not been modified after leaving the mill.
  - Displays full mill provenance, GSM variance, bow/skew rating, and 5-zone defect coordinates.

---

### 3.10. Device Connectivity Ecosystem (`/devices`)
Multi-device mill floor connectivity:
- **Telemetry Cards:** Real-time monitoring of connected inspection cameras and mobile companion devices.
  - Stream Role (`Overhead Table`, `Backlight Inspection`, `Handheld Companion`).
  - Ping latency in milliseconds ($12\text{ ms} - 45\text{ ms}$).
  - Live battery percentage indicator for cordless handheld scanners.
  - Stream status (`Online`, `Standby`, `Offline`).
- **Hardware Torch Remote Toggle:** Allows the desktop station to remotely turn on the high-intensity LED torch on connected handheld mobile devices for inspecting dark fabric weaves.
- **Device Pairing Modal:**
  - **QR Code Pairing:** Floor operators scan the displayed QR code with any mobile browser to instantly link the camera as a companion stream.
  - **6-Digit PIN Pairing:** Alternative pairing code for offline or terminal-based devices.
  - **RTSP / ONVIF IP Ingestion:** Enter network camera URI (`rtsp://192.168.1.104:554/live/ch0`) to ingest feeds from factory ceiling cameras.

---

### 3.11. Quality Analytics & Defect Intelligence (`/analytics`)
- **Defect Frequency Pareto Chart:** Identifies the top 80/20 fabric defects (e.g. Needle Lines, Oil Spots, Sinker Marks).
- **Shift Performance Comparison:** Compares defect generation rates between Shift A, Shift B, and Shift C to isolate operator or shift-specific maintenance issues.
- **Daily Quality Yield Trend:** Historical tracking of Grade A pass rates vs. rejection rates.
- **Automated Root-Cause Diagnosis:** Machine learning suggestions linking specific defect clusters to mechanical loom/knitting adjustments.

---

### 3.12. Configuration & Integration Hub (`/configuration`)
- **ASTM Tolerance Settings:** Adjust point penalty thresholds for specific buyer manuals (e.g. strict 20 pts/100 yd² for intimate apparel vs. 28 pts for outerwear).
- **Webhooks & API Push:**
  - Configure endpoints for SAP NetWeaver, FastReact Planning, or custom REST listeners.
  - Every event payload is cryptographically signed with an HMAC SHA-256 secret.
  - Full delivery log with response codes and payload inspector.

---

## 4. Mill Floor Operational Procedures

### 4.1. Shift Handover & Setup Checklist
1. **Power On Equipment:** Turn on inspection frame lighting (overhead $D65$ artificial daylight lamp, 1200 lux; table bottom backlight).
2. **Device Connection:** Open Tensora on the station terminal. Verify all camera feeds display `Online` with latency $< 50\text{ ms}$.
3. **Audio Alarm Test:** Click the siren icon in `/capture` to ensure floor speakers are active.
4. **Select / Create Roll:** Click `New Roll`, input fabric style, yarn count, circular knitting machine ID, and dye batch number.
5. **Physical Measurements:** Cut 3 GSM discs ($L/C/R$), weigh on gram balance, and record values. Measure bow/skew deflection percentage.

### 4.2. During Inspection
1. Start inspection table motor at standard speed ($15 - 20\text{ meters/minute}$).
2. Observe canvas HUD for bounding boxes.
3. If the siren sounds:
   - Immediately hit spacebar or `Pause` to freeze fabric advance.
   - Inspect highlighted defect.
   - If a continuous needle line is confirmed, tag flaw as `Continuous` and flag maintenance team for that knitting machine.
4. If a false alarm occurs (e.g. loose lint thread), click `Reject` on the defect card.

### 4.3. Post-Inspection & Roll Packaging
1. Stop motor at the end of the roll ($120\text{ m}$).
2. Review final ASTM D5430 score on `/grade`.
3. Click `Generate Certificate` to lock the record and calculate cryptographic hash.
4. Click `Print Roll Ticket`. Place the 4" $\times$ 6" thermal sticker onto the protective poly-wrap of the inspected fabric roll.
5. Click `Export Mill CSV` or trigger the automatic SAP ERP sync.

---

## 5. Technical Deployment & Setup Guide

### 5.1. Prerequisites
- **Node.js:** v18.18.0 or v20.x
- **Package Manager:** npm v9+
- **Database:** Supabase PostgreSQL instance with Realtime and pgvector enabled

### 5.2. Environment Variables Setup
Create a `.env.local` file in the project root:
```env
# Supabase Cloud Project Configuration
SUPABASE_PROJECT_ID="your-project-ref"
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Database Direct & Pooler Connection Strings (For migrations)
DATABASE_URL="postgresql://postgres.your-project-ref:password@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.your-project-ref:password@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"

# Client Vite Variables
VITE_SUPABASE_PROJECT_ID="your-project-ref"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
```

### 5.3. Database Initialization & Migration
Execute the automated migration scripts:
```bash
# 1. Verify database connection
node scripts/check_health.cjs

# 2. Run complete schema migration
node scripts/run_migration.cjs

# 3. Upgrade schema for Bangladesh QA fields & RPC functions
node scripts/upgrade_qa_schema.cjs

# 4. (Optional) Purge test data and reset to fresh baseline roll
node scripts/clean_database.cjs
```

### 5.4. Local Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) in Google Chrome or Microsoft Edge.

### 5.5. Production Build for Vercel Deployment
Tensora uses TanStack Start with Vinxi and Nitro preset for serverless edge deployment:
```bash
npm run build:vercel
```
This compiles client assets to `.vercel/output/static` and server functions to `.vercel/output/functions`.

---

## 6. Bilingual Defect Taxonomy Reference

| English Term | Bengali Term (বাংলা) | Standard ASTM D5430 Penalty | Common Mill Floor Root Cause |
| :--- | :--- | :---: | :--- |
| **Hole** | ফুটা / হোল | 4 Points | Broken needle hook or excessive yarn tension |
| **Needle Line** | নিডেল দাগ | 2 – 4 Points | Bent or chipped circular knitting latch needle |
| **Oil Stain** | তেলের দাগ | 2 – 4 Points | Excess lubrication from cylinder or sinker ring |
| **Drop Stitch** | ড্রপ স্টিচ | 4 Points | Yarn feed misthreading or dial-cylinder mismatch |
| **Slub** | স্ল্যাব / সুতার দলা | 1 – 3 Points | Spinning fault, uneven roving, or untwisted fiber |
| **Fly / Contamination**| উড়ন্ত সুতা / ফ্লাই | 1 – 2 Points | Foreign color fiber deposited from adjacent knitting machine |
| **Snag / Pull** | সুতা টানা / স্ন্যাগ | 1 – 3 Points | Fabric snagging on take-up roller or rough guide ring |
| **Knot** | সুতার গিট | 1 – 2 Points | Yarn breakage joint during cone winding |
| **Color Streak** | রঙের দাগ / শেড বার | 3 – 4 Points | Dye bath migration or chemical padding pressure imbalance |
| **Bowing / Skewing** | বোয়িং / তির্যক ত্রুটি | Alert Flag | Uneven stenter chain tension or yarn twist torque |

---

## 7. Security, Roles & Data Sovereignty

- **Role-Based Access Control (RBAC):**
  - `operator`: Can stream camera, capture frames, and print tickets.
  - `qa_lead`: Can verify/reject defect triage, edit roll specifications, and generate audit certificates.
  - `plant_manager`: Full access including integration endpoint webhook setup, tolerance threshold changes, and financial reports.
- **Data Protection:**
  - Client state writes are validated through Row-Level Security (`has_any_role`) in PostgreSQL.
  - API keys and AI reasoning models execute exclusively in serverless backend functions (`ai.functions.ts`), ensuring zero credential exposure on mill tablets.
  - Cryptographic signatures (`verification_hash`) prevent modification of historical roll quality ratings after buyer dispatch.

---

*Tensora Fabric QA Platform — Built for precision textile engineering.*
