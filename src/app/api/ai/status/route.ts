import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
export async function GET() {
 const supabase = await createClient();
 const {data:{user},error} = await supabase.auth.getUser();
 if(error || !user) return NextResponse.json({error:"Authentication required."},{status:401});
 const {data:profile} = await supabase.from("profiles").select("is_active").eq("id",user.id).maybeSingle();
 if(!profile?.is_active) return NextResponse.json({error:"Active agency account required."},{status:403});
 return NextResponse.json({configured:Boolean(process.env.GEMINI_API_KEY),provider:"Google Gemini",model:process.env.GEMINI_MODEL || "gemini-2.5-flash"});
}
