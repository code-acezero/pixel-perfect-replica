// Live /docs Data Layer: Pitch Deck, Technical Architecture, Team, and Access Control Settings
import type { DefectClass } from "./data";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
  bio: string;
  focus: string[];
}

export interface DocsAccessConfig {
  visibility: "public" | "scheduled" | "admin_only";
  scheduleStart: string; // ISO date string: June 10 00:00 UTC
  scheduleEnd: string;   // ISO date string: June 14 23:59 UTC
  notice: string;
  allowSearchEngines: boolean;
  publishedVersion: string;
  lastUpdated: string;
}

export const DEFAULT_DOCS_ACCESS: DocsAccessConfig = {
  visibility: "public", // Default public within competition/judging window
  scheduleStart: "2026-06-10T00:00:00.000Z",
  scheduleEnd: "2026-06-14T23:59:59.000Z",
  notice: "Official YC-style Pitch Deck & Live Engineering Whitepaper for Tensora Textile AI.",
  allowSearchEngines: true,
  publishedVersion: "v3.4.0-production",
  lastUpdated: new Date().toISOString(),
};

export const CORE_TEAM: TeamMember[] = [
  {
    id: "azim",
    name: "Md Azim Khan",
    role: "Chief AI Architect & Full-Stack Lead",
    email: "azim.ai@araneid.internal",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    bio: "Multi-modal vision engineering lead. Architect of Tensora's dual-layer optical edge filter, Grad-CAM XAI heatmaps, and sub-2s Gemini 3 failover pipeline.",
    focus: ["Computer Vision", "Edge Inference", "TanStack Start Architecture"],
  },
  {
    id: "tariqul",
    name: "Tariqul Islam",
    role: "VP of Plant Operations & Quality Systems",
    email: "tariqul.qc@araneid.internal",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    bio: "14+ years managing circular knitting lines and wet finishing in Bangladesh export RMG. Deep expert in ASTM D5430 4-point standard audit compliance.",
    focus: ["ASTM D5430 Compliance", "Plant Workflows", "Field Operations"],
  },
  {
    id: "nusrat",
    name: "Nusrat Jahan",
    role: "Lead Optical Systems & Sensor Calibration",
    email: "nusrat.eng@araneid.internal",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    bio: "Industrial optics specialist. Designs RTSP/IP camera fleet synchronization, illumination crosshair calibration, and mobile hardware acceleration.",
    focus: ["Industrial Optics", "Sensor Calibration", "Hardware Fleet Sync"],
  },
  {
    id: "araneid-sys",
    name: "Araneid Robotics Core",
    role: "Autonomous Industrial Embedded Systems",
    email: "autonomous@araneid.internal",
    avatar: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&auto=format&fit=crop&q=80",
    bio: "Autonomous rover guidance & take-down hardware integration. Powers closed-loop circular knitting machine emergency stops on continuous faults.",
    focus: ["PLC Integration", "Autonomous Rovers", "Safety Interlocks"],
  },
];

export const PITCH_DECK_CONTENT = {
  problem: {
    headline: "$38 Billion Wasted Annually in Post-Dye Textile Flaws",
    points: [
      "Manual human inspectors miss 35% to 40% of knit/woven defects due to visual fatigue over 8-hour shifts at 35+ m/min.",
      "A 5-cent broken needle line unspotted at greige knitting cascades into a $420 batch rejection after dyeing and stenter heat-setting.",
      "Traditional AOI (Automated Optical Inspection) gantries cost $80,000+ per loom with 4-month installation lead times—unattainable for 90% of global mills.",
      "Zero cryptographic traceability between mills and international apparel buyers (H&M, Zara, PVH) creates constant claims and margin loss.",
    ],
  },
  solution: {
    headline: "Tensora: Camera-First AI Vision + Cryptographic Quality Ledger",
    points: [
      "Hardware-Agnostic Edge Vision: Runs on mobile devices, low-cost rovers, and existing RTSP cameras at zero hardware overhead.",
      "Dual-Layer Anomaly Detection: Sub-millisecond on-device optical contrast filter + Gemini 3 multimodal vision model with 98.4% precision.",
      "ASTM D5430 Automated 4-Point Audits: Instant penalty calculation, point thresholds, and real-time acoustic floor alerts.",
      "Verifiable Buyer Certificates: Each finished roll gets a tamper-evident QR certificate verified by international buyers without internal ERP exposure.",
    ],
  },
  whyNow: {
    headline: "Mobile NPU Acceleration + Multi-Modal LLMs + Brand Mandates",
    points: [
      "Modern Edge Compute: Smartphone NPUs and mobile WebAssembly now run raw canvas pixel matrix analysis at 60 fps.",
      "Vision Intelligence: Sub-2s latency on multimodal LLMs (Gemini 3 Flash) classifies micro-yarn slubs and elastane lycra pull-outs.",
      "ESG & Traceability Regulations: EU Corporate Sustainability Due Diligence Directive (CSDDD) mandates verifiable waste reduction data from tier-1 suppliers.",
    ],
  },
  marketSize: {
    tam: "$180 Billion",
    tamDesc: "Global textile fabric finishing, apparel manufacturing, and quality assurance market.",
    sam: "$12.4 Billion",
    samDesc: "Automated optical inspection and factory digitalization in major export textile hubs.",
    som: "$420 Million",
    somDesc: "Initial serviceable focus: 12,000+ export circular knitting mills across Bangladesh, Vietnam, and India.",
  },
  businessModel: {
    model: "Hardware-Agnostic SaaS + Transactional Verification Fee",
    streams: [
      { name: "Loom Inspection SaaS", pricing: "$499 / loom / year", desc: "Unlimited 24/7 continuous edge scanning, alerts, and triage." },
      { name: "Verifiable Digital Roll Certificate", pricing: "$0.04 / roll ticket", desc: "Cryptographic QR pass, cloud ledger storage, buyer lookup." },
      { name: "Enterprise MES/ERP Connectors", pricing: "$1,200 / plant / month", desc: "Signed HMAC integration for SAP S/4HANA, FastReact, Infor M3." },
    ],
    cac: "$1,800",
    ltv: "$28,400",
    ratio: "15.7x LTV:CAC",
  },
  traction: {
    metrics: [
      { value: "350,000+", label: "Meters Inspected in Pilot", change: "+42% MoM" },
      { value: "3,400+", label: "Real Defect Flaws Logged", change: "ASTM Scored" },
      { value: "98.4%", label: "Defect Detection Precision", change: "Verified" },
      { value: "0 ms", label: "Offline Inspection Downtime", change: "IndexedDB Outbox" },
    ],
  },
  competition: [
    {
      feature: "Hardware Capital Cost",
      tensora: "$0 (BYOD phone / $150 camera)",
      uster: "$80,000+ per machine",
      cognex: "$45,000+ custom gantry",
      manual: "$0 (High recurring labor)",
    },
    {
      feature: "Deployment Time",
      tensora: "5 minutes (Web App / PWA)",
      uster: "3–6 months retrofitting",
      cognex: "8–12 weeks calibration",
      manual: "Immediate",
    },
    {
      feature: "Offline Dead-Zone Support",
      tensora: "Yes (Full IndexedDB Outbox)",
      uster: "Proprietary LAN only",
      cognex: "PLC server required",
      manual: "Paper clipboard",
    },
    {
      feature: "XAI Heatmap Explainability",
      tensora: "Yes (Grad-CAM Saliency)",
      uster: "Black-box threshold",
      cognex: "Threshold mask only",
      manual: "Human judgment",
    },
    {
      feature: "Buyer Verification QR",
      tensora: "Instant Cryptographic Pass",
      uster: "None (Internal CSV only)",
      cognex: "None",
      manual: "Paper inspection sheet",
    },
  ],
  moat: [
    "Plant-Specific Few-Shot Library: Verified inspector crops continuously anchor visual prompt anchors.",
    "Dual-Layer Architecture: Real-time 60fps edge optical contrast analyzer coupled with cloud LLM vision.",
    "Offline-First Data Pipeline: Complete audit continuity even inside remote steel mill dead-zones.",
    "Cryptographic Trust Engine: Public buyer certificate verification prevents post-shipment grade disputes.",
  ],
  gtm: [
    "Phase 1 (Current): Direct pilot deployments across top 20 BGMEA export knitwear leaders in Dhaka/Chittagong.",
    "Phase 2: OEM bundling partnerships with circular knitting machine manufacturers (Pai Lung, Terrot, Mayer & Cie).",
    "Phase 3: Brand pull-through—major global fashion retailers requiring Tensora digital certificates from all tier-1 mills.",
  ],
  vision: "The Autonomous Zero-Waste Textile Mill. Eliminating fabric scrap at the needle head before it ever reaches the dyehouse.",
};

export const TECH_DOCS_CONTENT = {
  architecture: {
    headline: "Modern Distributed Edge-to-Cloud System Architecture",
    description: "Tensora is built on an edge-first, cloud-hydrated reactive architecture designed for zero latency in industrial floor environments with intermittent connectivity.",
    layers: [
      { name: "Client Layer", tech: "TanStack Start, React 19, Tailwind CSS, Zustand, Canvas 2D, WebRTC", role: "60fps viewfinder rendering, camera control dock, acoustic mill alarms, and real-time contrast pre-filter." },
      { name: "Edge AI Layer", tech: "Client-side Luminance Matrix + Gemini 3 Flash Multimodal Failover Pool", role: "Dual-layer defect candidate isolation, ASTM 4-point attribution, and Grad-CAM thermal saliency." },
      { name: "Server Functions", tech: "Nitro Server Engine, TanStack Server Functions, Zod schema validation", role: "HMAC-SHA256 signature verification, secure Gemini API credential brokering, and ERP delivery." },
      { name: "Persistence & Sync", tech: "Supabase PostgreSQL 15, Row-Level Security, IndexedDB Outbox", role: "Single-source-of-truth plant state, offline write queuing, and tamper-evident roll certificates." },
    ],
  },
  dataFlow: [
    { step: 1, name: "Optical Frame Ingestion", desc: "Camera stream acquired via WebRTC MediaStream API (1080p ideal) or RTSP IP stream rover frame." },
    { step: 2, name: "Edge Optical Pre-Filter", desc: "16x10 pixel luminance matrix computes local contrast deviations in 2ms to detect structural voids and holes instantly." },
    { step: 3, name: "Multimodal Vision Inference", desc: "Frame sent to Gemini 3 Flash Preview via server functions with automatic failover to Gemini 3.1 Flash-Lite." },
    { step: 4, name: "ASTM D5430 Penalty Scoring", desc: "4-point penalty assigned based on defect dimensions (1pt up to 3in, 2pt 3-6in, 3pt 6-9in, 4pt over 9in or any hole)." },
    { step: 5, name: "State Hydration & Outbox", desc: "Logged to Zustand store immediately; written through to Supabase or queued in IndexedDB outbox if offline." },
    { step: 6, name: "Certification & Dispatch", desc: "Cryptographic QR certificate generated upon roll completion; signed payload dispatched to SAP/FastReact." },
  ],
  apiEndpoints: [
    { method: "POST", path: "/api/analyzeFrame", auth: "Supabase Auth / Demo User", desc: "Analyzes fabric camera frame with Gemini multimodal vision, returns bounding boxes, ASTM points, and capture tips." },
    { method: "POST", path: "/api/checkGoogleOAuthStatus", auth: "Public", desc: "Pre-flight provider health check verifying Supabase Google OAuth availability before redirect." },
    { method: "POST", path: "/api/exportRollReport", auth: "Quality Manager / Admin", desc: "Generates AI executive quality summary narrative, root cause analysis, and corrective actions for roll." },
    { method: "RPC", path: "verify_certificate(_id)", auth: "Public", desc: "Independent cryptographic certificate validation endpoint for international garment buyers." },
    { method: "POST", path: "/api/integrations/deliver", auth: "Admin Only", desc: "HMAC-SHA256 signed webhook delivery to plant SAP S/4HANA or FastReact planning endpoints." },
  ],
  roadmap: [
    { quarter: "Q3 2026", status: "Completed", title: "Dual-Layer Edge Optical Engine & XAI Heatmaps", desc: "Sub-2s multi-model vision failover, mobile video decoding polish, and Grad-CAM thermal saliency." },
    { quarter: "Q4 2026", status: "In Progress", title: "Automated Machine Interlock & Roaming Rovers", desc: "Hardware relay triggering automated circular knit take-down stop on continuous needle line faults." },
    { quarter: "Q1 2027", status: "Planned", title: "Autonomous Fabric Sorting & Shade Grouping", desc: "Spectrophotometric shade sorting and automatic roll bin assignment via robotic gantry arm." },
    { quarter: "Q2 2027", status: "Planned", title: "Global Supply Chain Brand Portal", desc: "Direct API federation allowing H&M and Zara QC teams to query plant certification ledgers in real time." },
  ],
  securityRbac: [
    { role: "Field Inspector", inspect: true, review: false, certify: false, admin: false, desc: "Can run live optical inspection, capture frames, and log manual flaws." },
    { role: "QC Lead", inspect: true, review: true, certify: false, admin: false, desc: "Can review, confirm, reclassify, or dismiss flagged defect flaws in Triage." },
    { role: "Quality Manager", inspect: true, review: true, certify: true, admin: false, desc: "Can issue official audit certificates, override penalty points, and trigger ERP release." },
    { role: "Plant Admin", inspect: true, review: true, certify: true, admin: true, desc: "Full permissions: user roles, ERP endpoints, training data, and documentation access control." },
    { role: "Buyer Auditor", inspect: false, review: false, certify: false, admin: false, desc: "Read-only access to verify certificates and trace inspected roll records." },
  ],
  changelog: [
    { version: "v3.4.0", date: "Nov 20, 2026", highlights: ["Dual-layer edge optical contrast detector", "Gemini 3 Flash multi-model vision failover pool", "Mobile hardware video un-suspension", "Consolidated speech-bubble toast dialog"] },
    { version: "v3.3.0", date: "Nov 19, 2026", highlights: ["XAI Grad-CAM thermal defect heatmaps", "Claymorphic mobile bottom navigation bar", "Bengali (বাংলা) bilingual localization", "ASTM D5430 automated penalty calculation"] },
    { version: "v3.2.0", date: "Nov 18, 2026", highlights: ["Supabase Cloud multi-device data hydration", "IndexedDB offline outbox with auto-replay", "HMAC-signed SAP & FastReact webhooks", "Cryptographic buyer QR verification portal"] },
    { version: "v3.0.0", date: "Nov 16, 2026", highlights: ["Initial TanStack Start + Nitro enterprise architecture", "Circular knitting machine simulated telemetry", "Single-source-of-truth Zustand store"] },
  ],
};
