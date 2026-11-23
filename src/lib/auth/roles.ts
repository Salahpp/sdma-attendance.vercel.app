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
  const common = ["Overview", "Tasks & Projects", "Attendance", "Daily Reports", "Leave Management", "Announcements", "AI Engine"];
  if (role === "staff" || role === "marketer" || role === "designer") return [...common, "Content Calendar"];
  if (role === "team_lead") return [...common, "Clients & CRM", "Content Calendar", "Ads & Leads", "Team & Roles", "Reports & Documents"];
  if (role === "accounts") return [...common, "Clients & CRM", "Finance & Payroll", "Reports & Documents"];
  if (role === "office_admin") return [...common, "Clients & CRM", "Content Calendar", "Ads & Leads", "Team & Roles", "Finance & Payroll", "Academy Management", "HR Reports", "Reports & Documents"];
  return [...common, "Clients & CRM", "Content Calendar", "Ads & Leads", "Team & Roles", "Finance & Payroll", "Academy Management", "HR Reports", "Reports & Documents"];
}