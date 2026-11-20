import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SdmaRole } from "./roles";

export async function requireProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || !profile.is_active) redirect("/access-denied");
  return { user, profile: { ...profile, role: profile.role as SdmaRole } };
}