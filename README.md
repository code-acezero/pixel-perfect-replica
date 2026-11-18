# Tensora — AI Fabric Defect Inspection & Mill Operating System

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20Realtime-3ECF8E?logo=supabase)](https://supabase.com)
[![Compliance](https://img.shields.io/badge/ASTM%20D5430-4--Point%20Standard-blue)]()
[![Bilingual](https://img.shields.io/badge/Bilingual-English%20%7C%20বাংলা-success)]()

**Tensora** is an industrial-grade AI-powered Textile Quality Assurance (QA) Operating System and Automated Defect Triage Platform engineered for the ready-made garment (RMG) textile manufacturing industry in Bangladesh (Ashulia, Gazipur, Narayanganj) and global apparel supply chains.

It provides real-time multi-camera defect inspection, human-in-the-loop triage, automated ASTM D5430 4-point scoring, physical ASTM D3776 GSM compliance checks, mill floor acoustic alarms, 4" $\times$ 6" thermal roll ticket printing, one-click SAP/FastReact ERP export, and tamper-proof cryptographic audit certificates for global apparel buyers.

---

## 📖 Complete Documentation & User Guide

For an in-depth walkthrough of every feature, architectural diagram, ASTM mathematical formulas, device pairing instructions, and operational procedures, refer to the **[Tensora Operational Manual & User Guide](file:///d:/ACE%20ZERO/My%20web%20Project%20Data/Hackathon%20Project/Tensora/USER_GUIDE.md)**.

---

## ⚡ Key Highlights & Capabilities

| Module | Core Features | Standard / Technology |
| :--- | :--- | :--- |
| **Live Inspection (`/capture`)** | Real-time computer vision bounding boxes, 60 FPS canvas HUD, mill floor acoustic siren, multi-device viewport switcher. | HTML5 Canvas, Web Audio API (880-1760 Hz), WebRTC/RTSP |
| **Defect Triage (`/triage`)** | Human-in-the-loop verification, few-shot visual exemplar promotion, spatial zone breakdown (Left Selvedge to Right Selvedge). | Few-shot Computer Vision, Supabase Storage |
| **Scoring & Grading (`/grade`)** | Automated cuttable width deduction ($W_{\text{cut}} = W_{\text{gross}} - 1.0"$), points per $100\text{ yd}^2$, continuous fault quarantine rule. | **ASTM D5430 (4-Point)**, **Graniteville 78** |
| **Physical Lab Tests (`/trace/$rollId`)**| 3-point cross-width GSM variance verification ($L/C/R \le \pm 5\%$), bow and skew spirality deflection test. | **ASTM D3776**, **ASTM D3882 / ISO 16322** |
| **Thermal Roll Tickets** | High-contrast 4" $\times$ 6" mill adhesive label generator with Code 128 barcode and QR verification. | Zebra/Honeywell Thermal Printer Engine |
| **ERP & MES Integration** | One-click 27-column spreadsheet export, HMAC SHA-256 authenticated webhook event streaming. | SAP AFS, Coats Digital FastReact, Infor Fashion |
| **Cryptographic Certificates (`/verify/$certId`)** | Publicly accessible buyer verification portal with tamper-proof SHA-256 integrity hash. | Zero-auth Public Route, SHA-256 Cryptography |
| **Bilingual Interface** | Instant topbar language toggle (`EN \| বাং`) translating defect taxonomy and shift schedules into Bengali mill vernacular. | Native i18n State Architecture |
| **Device Ecosystem (`/devices`)** | Multi-role fleet cards (Overhead, Backlit, Handheld), live ping telemetry, battery monitor, remote hardware torch control, QR/PIN pairing. | MediaStream ImageCapture API, WebSockets |

---

## 🛠️ Technology Stack

- **Frontend & App Framework:** [TanStack Start](https://tanstack.com/start) / React 18, Vite, Tailwind CSS, Lucide Icons, Canvas 2D
- **State Management & Offline Storage:** [Zustand](https://github.com/pmndrs/zustand), IndexedDB Outbox Queue, Vite PWA Service Worker
- **Cloud Backend & Database:** [Supabase](https://supabase.com) (PostgreSQL 15+, Row-Level Security, Realtime WebSockets, Stored Procedures)
- **Deployment Platform:** [Vercel](https://vercel.com) (Serverless Nitro Functions + Edge Static CDN)
- **Audio Synthesizer:** Native Web Audio API frequency-modulated dual-tone siren (880 Hz $\rightarrow$ 1760 Hz)
- **Enterprise Integrations:** Webhooks with HMAC SHA-256 signatures, CSV export for SAP / FastReact

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js:** v18.18.0 or v20.x
- **Package Manager:** npm v9+
- **Supabase Account:** Standard or Enterprise PostgreSQL instance

### 2. Environment Variables
Create a `.env.local` file in the root directory (see `.env.example` for reference):
```env
SUPABASE_PROJECT_ID="your-project-ref"
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

DATABASE_URL="postgresql://postgres.your-project-ref:password@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres"

VITE_SUPABASE_PROJECT_ID="your-project-ref"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
```

### 3. Database Migration
Run the database scripts using Node.js:
```bash
# Verify database connection
node scripts/check_health.cjs

# Execute full schema migration
node scripts/run_migration.cjs

# Apply Bangladesh RMG QA fields & stored procedures
node scripts/upgrade_qa_schema.cjs
```

### 4. Run Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

### 5. Production Build
```bash
# Build for Vercel Serverless
npm run build:vercel

# Run automated test suites
npm run test
```

---

## 📄 License & Attribution

Tensora is engineered for enterprise textile production. Built with precision for Bangladeshi RMG factories and global compliance standards.
