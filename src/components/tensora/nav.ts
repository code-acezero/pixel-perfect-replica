import {
  Activity,
  Award,
  BarChart3,
  Camera,
  ClipboardCheck,
  FileBadge,
  GitBranch,
  Lightbulb,
  Settings2,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  module: string;
  to: string;
  icon: LucideIcon;
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Inspect",
    items: [
      { title: "Command", module: "Tensora Command", to: "/", icon: Activity },
      { title: "Capture", module: "Tensora Capture", to: "/capture", icon: Camera },
      { title: "Triage", module: "Tensora Triage", to: "/triage", icon: ClipboardCheck },
    ],
  },
  {
    label: "Quality",
    items: [
      { title: "Trace", module: "Tensora Trace", to: "/trace", icon: GitBranch },
      { title: "Grade", module: "Tensora Grade", to: "/grade", icon: Award },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { title: "Insight", module: "Tensora Insight", to: "/insight", icon: Lightbulb },
      { title: "Analytics", module: "Tensora Analytics", to: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Compliance",
    items: [{ title: "Certify", module: "Tensora Certify", to: "/certify", icon: FileBadge }],
  },
  {
    label: "System",
    items: [
      { title: "Devices", module: "Tensora Devices", to: "/devices", icon: Smartphone },
      { title: "Configuration", module: "System Configuration", to: "/configuration", icon: Settings2 },
    ],
  },
];

export const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);
