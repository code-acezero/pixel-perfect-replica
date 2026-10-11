import type { Role } from "./store";

export type DbRole = "field_inspector" | "qc_lead" | "quality_manager" | "plant_admin" | "buyer_auditor";

export const ROLE_LABEL: Record<DbRole, Role> = {
  field_inspector: "Field Inspector",
  qc_lead: "QC Lead",
  quality_manager: "Quality Manager",
  plant_admin: "Plant Admin",
  buyer_auditor: "Buyer Auditor",
};
export const DB_ROLES = Object.keys(ROLE_LABEL) as DbRole[];

/** Highest-privilege role wins when a user holds several. */
const RANK: DbRole[] = ["plant_admin", "quality_manager", "qc_lead", "field_inspector", "buyer_auditor"];
export function primaryRole(roles: DbRole[]): DbRole {
  return RANK.find((r) => roles.includes(r)) ?? "buyer_auditor";
}

export type Action = "inspect" | "review" | "certify" | "admin";
const ALLOWED: Record<Action, DbRole[]> = {
  inspect: ["field_inspector", "qc_lead", "quality_manager", "plant_admin"],
  review: ["qc_lead", "quality_manager", "plant_admin"],
  certify: ["quality_manager", "plant_admin"],
  admin: ["plant_admin"],
};
/** UI-only hint; the database policies are the real boundary. */
export function can(role: DbRole, action: Action) {
  return ALLOWED[action].includes(role);
}
