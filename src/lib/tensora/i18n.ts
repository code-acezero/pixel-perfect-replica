import { useTensora } from "./store";

export type Language = "en" | "bn";

export const I18N = {
  nav: {
    inspect: { en: "Inspect", bn: "পরিদর্শন (Inspect)" },
    command: { en: "Command", bn: "কমান্ড রুম" },
    commandModule: { en: "Tensora Command", bn: "টেনসোরা কমান্ড" },
    capture: { en: "Capture", bn: "ক্যাপচার স্টেশন" },
    captureModule: { en: "Tensora Capture", bn: "টেনসোরা ক্যাপচার" },
    triage: { en: "Triage", bn: "ত্রুটি ট্রায়াজ" },
    triageModule: { en: "Tensora Triage", bn: "টেনসোরা ট্রায়াজ" },
    quality: { en: "Quality", bn: "মান ও কোয়ালিটি (Quality)" },
    trace: { en: "Trace", bn: "রোল ট্রেস" },
    traceModule: { en: "Tensora Trace", bn: "টেনসোরা ট্রেস" },
    grade: { en: "Grade", bn: "বায়ার গ্রেডিং" },
    gradeModule: { en: "Tensora Grade", bn: "টেনসোরা গ্রেড" },
    intelligence: { en: "Intelligence", bn: "ইন্টেলিজেন্স (Intelligence)" },
    insight: { en: "Insight", bn: "ফ্যাক্টরি ইনসাইট" },
    insightModule: { en: "Tensora Insight", bn: "টেনসোরা ইনসাইট" },
    analytics: { en: "Analytics", bn: "অ্যানালিটিক্স" },
    analyticsModule: { en: "Tensora Analytics", bn: "টেনসোরা অ্যানালিটিক্স" },
    compliance: { en: "Compliance", bn: "কমপ্লায়েন্স (Compliance)" },
    certify: { en: "Certify", bn: "সার্টিফিকেট" },
    certifyModule: { en: "Tensora Certify", bn: "টেনসোরা সার্টিফিকেট" },
    system: { en: "System", bn: "সিস্টেম সেটিংস (System)" },
    devices: { en: "Devices", bn: "ক্যামেরা ফ্লিট" },
    devicesModule: { en: "Tensora Devices", bn: "টেনসোরা ডিভাইস" },
    configuration: { en: "Configuration", bn: "কনফিগারেশন" },
    configurationModule: { en: "System Configuration", bn: "সিস্টেম কনফিগারেশন" },
  },
  topbar: {
    search: { en: "Search actions & rolls… (⌘K)", bn: "খুঁজুন বা কমান্ড দিন… (⌘K)" },
    live: { en: "LIVE CAMERA", bn: "লাইভ ক্যামেরা" },
    sim: { en: "SIMULATED", bn: "সিমুলেশন" },
    pairCamera: { en: "Pair Camera (QR)", bn: "ক্যামেরা পেয়ারিং (QR)" },
    activeRoll: { en: "Active Roll", bn: "চলতি রোল" },
    syncing: { en: "Syncing…", bn: "সিঙ্ক হচ্ছে…" },
    queued: { en: "Queued", bn: "কিউতে জমা" },
    offline: { en: "Offline", bn: "অফলাইন" },
    alerts: { en: "Active Alerts", bn: "সক্রিয় সতর্কবার্তা" },
    signOut: { en: "Sign out", bn: "লগ আউট" },
    alarmOn: { en: "Floor Alarm: ON", bn: "ফ্লোর সাইরেন: চালু" },
    alarmOff: { en: "Floor Alarm: OFF", bn: "ফ্লোর সাইরেন: বন্ধ" },
  },
  common: {
    pass: { en: "PASS", bn: "পাস (PASS)" },
    reject: { en: "REJECT", bn: "রিজেক্ট (REJECT)" },
    exportReady: { en: "Export Ready", bn: "রপ্তানি উপযোগী" },
    inspecting: { en: "Inspecting", bn: "পরিদর্শন চলছে" },
    certified: { en: "Certified", bn: "সার্টিফাইড" },
    graded: { en: "Graded", bn: "গ্রেডিং সম্পন্ন" },
    queuedRoll: { en: "Queued", bn: "অপেক্ষমান" },
    cuttableWidth: { en: "Cuttable Width", bn: "কাটেবল প্রস্থ" },
    penaltyPoints: { en: "Penalty Points", bn: "পেনাল্টি পয়েন্ট" },
    defectsCount: { en: "Defects", bn: "ত্রুটির সংখ্যা" },
    length: { en: "Length", bn: "দৈর্ঘ্য" },
    speed: { en: "Speed", bn: "গতি" },
    shift: { en: "Shift", bn: "শিফট" },
    machine: { en: "Machine / Cylinder", bn: "মেশিন / সিলিন্ডার" },
    yarnLot: { en: "Yarn Lot", bn: "সুতার লট" },
    dyeBatch: { en: "Dye Batch", bn: "ডাইং ব্যাচ" },
    fabricType: { en: "Fabric Type", bn: "কাপড়ের ধরন" },
    supplier: { en: "Supplier", bn: "সাপ্লায়ার" },
    buyer: { en: "Buyer", bn: "বায়ার" },
    score: { en: "Score", bn: "স্কোর" },
    grade: { en: "Grade", bn: "গ্রেড" },
    issueCert: { en: "Issue Certificate", bn: "সার্টিফিকেট তৈরি" },
    printPdf: { en: "Print / PDF", bn: "প্রিন্ট / পিডিএফ" },
    share: { en: "Share", bn: "শেয়ার করুন" },
    verify: { en: "Verify", bn: "যাচাই করুন" },
    save: { en: "Save", bn: "সংরক্ষণ" },
    cancel: { en: "Cancel", bn: "বাতিল" },
    filter: { en: "Filter", bn: "ফিল্টার" },
    all: { en: "All", bn: "সকল" },
    pending: { en: "Pending", bn: "বিবেচ্য" },
    confirmed: { en: "Confirmed", bn: "অনুমোদিত" },
    reclassified: { en: "Reclassified", bn: "সংশোধিত" },
    dismissed: { en: "Dismissed", bn: "বাতিলকৃত" },
  },
  roles: {
    plant_admin: { en: "Plant Admin", bn: "প্ল্যান্ট অ্যাডমিন (Plant Admin)" },
    qc_lead: { en: "QC Lead", bn: "কিউসি লিড (QC Lead)" },
    quality_manager: { en: "Quality Manager", bn: "কোয়ালিটি ম্যানেজার (QA Head)" },
    field_inspector: { en: "Field Inspector", bn: "ফিল্ড ইন্সপেক্টর (Inspector)" },
    buyer_auditor: { en: "Buyer Auditor", bn: "বায়ার অডিটর (Auditor)" },
  },
} as const;

export function getTranslation(path: string, lang: Language = "en"): string {
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = I18N;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return path;
    cur = cur[p];
  }
  if (cur && typeof cur === "object" && lang in cur) {
    return cur[lang];
  }
  return typeof cur === "string" ? cur : path;
}

export function useTranslation() {
  const language = useTensora((s) => s.language);
  const setLanguage = useTensora((s) => s.setLanguage);
  const isBn = language === "bn";
  const t = (path: string) => getTranslation(path, language);

  return { language, setLanguage, isBn, t };
}
