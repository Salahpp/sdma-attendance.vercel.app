import type { Database } from "@/types/database.types";

export type SdmaRole = Database["public"]["Enums"]["sdma_role"];

export const SDMA_ROLES: readonly SdmaRole[] = [
  "ceo", "operations_manager", "team_lead", "office_admin",
  "marketer", "designer", "accounts", "staff"
] as const;

export function canManageOperations(role: SdmaRole) {
  return ["ceo", "operations_manager", "team_lead", "office_admin"].includes(role);
}

export function canManagePeople(role: SdmaRole) {
  return role === "ceo" || role === "operations_manager";
}

export function canViewFinance(role: SdmaRole) {
  return ["ceo", "operations_manager", "accounts"].includes(role);
}

export function canManageAds(role: SdmaRole) {
  return ["ceo", "operations_manager", "team_lead", "office_admin"].includes(role);
}

export function visibleModules(role: SdmaRole) {
  const common = ["Overview", "Tasks & Projects", "Attendance", "Daily Reports", "Leave Management", "Announcements"];
  if (role === "staff" || role === "marketer" || role === "designer") return [...common, "Content Calendar"];
  if (role === "team_lead" || role === "office_admin") return [...common, "Clients & CRM", "Content Calendar", "Ads & Leads", "Team & Roles"];
  if (role === "accounts") return [...common, "Clients & CRM", "Finance & Payroll", "Accounts"];
  return [...common, "Clients & CRM", "Content Calendar", "Ads & Leads", "Team & Roles", "Finance & Payroll", "Accounts"];
}