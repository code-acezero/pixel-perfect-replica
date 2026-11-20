import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  Camera,
  ClipboardCheck,
  FileBadge,
  GitBranch,
  Lightbulb,
  Settings2,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import type { Language } from "@/lib/tensora/i18n";

export interface NavItem {
  title: string;
  module: string;
  to: string;
  icon: LucideIcon;
}

export function getNavGroups(lang: Language = "en"): { label: string; items: NavItem[] }[] {
  const isBn = lang === "bn";
  return [
    {
      label: isBn ? "পরিদর্শন (Inspect)" : "Inspect",
      items: [
        { title: isBn ? "কমান্ড সেন্টার" : "Command", module: isBn ? "টেনসোরা কমান্ড" : "Tensora Command", to: "/", icon: Activity },
        { title: isBn ? "ক্যাপচার স্টেশন" : "Capture", module: isBn ? "টেনসোরা ক্যাপচার" : "Tensora Capture", to: "/capture", icon: Camera },
        { title: isBn ? "ত্রুটি ট্রায়াজ" : "Triage", module: isBn ? "টেনসোরা ট্রায়াজ" : "Tensora Triage", to: "/triage", icon: ClipboardCheck },
      ],
    },
    {
      label: isBn ? "কোয়ালিটি (Quality)" : "Quality",
      items: [
        { title: isBn ? "রোল ট্রেস" : "Trace", module: isBn ? "টেনসোরা ট্রেস" : "Tensora Trace", to: "/trace", icon: GitBranch },
        { title: isBn ? "বায়ার গ্রেডিং" : "Grade", module: isBn ? "টেনসোরা গ্রেড" : "Tensora Grade", to: "/grade", icon: Award },
      ],
    },
    {
      label: isBn ? "ইন্টেলিজেন্স (Intelligence)" : "Intelligence",
      items: [
        { title: isBn ? "ফ্যাক্টরি ইনসাইট" : "Insight", module: isBn ? "টেনসোরা ইনসাইট" : "Tensora Insight", to: "/insight", icon: Lightbulb },
        { title: isBn ? "অ্যানালিটিক্স" : "Analytics", module: isBn ? "টেনসোরা অ্যানালিটিক্স" : "Tensora Analytics", to: "/analytics", icon: BarChart3 },
      ],
    },
    {
      label: isBn ? "কমপ্লায়েন্স ও রিসোর্স" : "Compliance & Resources",
      items: [
        { title: isBn ? "সার্টিফিকেট" : "Certify", module: isBn ? "টেনসোরা সার্টিফিকেট" : "Tensora Certify", to: "/certify", icon: FileBadge },
        { title: isBn ? "পিচ ও ডকস" : "Pitch & Docs", module: isBn ? "টেনসোরা ডকুমেন্টস" : "Tensora /docs", to: "/docs", icon: BookOpen },
      ],
    },
    {
      label: isBn ? "সিস্টেম (System)" : "System",
      items: [
        { title: isBn ? "ডিভাইস ফ্লিট" : "Devices", module: isBn ? "টেনসোরা ডিভাইস" : "Tensora Devices", to: "/devices", icon: Smartphone },
        { title: isBn ? "কনফিগারেশন" : "Configuration", module: isBn ? "সিস্টেম কনফিগারেশন" : "System Configuration", to: "/configuration", icon: Settings2 },
      ],
    },
  ];
}

export const NAV_GROUPS = getNavGroups("en");
export const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);
