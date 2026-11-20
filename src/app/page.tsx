import Dashboard from "./dashboard-client";
import { requireProfile } from "@/lib/auth/profile";

export default async function HomePage() {
  const { user, profile } = await requireProfile();
  return <Dashboard fullName={profile.full_name || user.email || "Team member"} role={profile.role} />;
}