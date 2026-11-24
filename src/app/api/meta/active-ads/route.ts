import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptMetaToken,metaConfig } from "@/lib/meta-crypto";
export const runtime="nodejs";
export const maxDuration=60;
export async function GET(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();if(!profile?.is_active||!["ceo","operations_manager","team_lead","office_admin","digital_marketer"].includes(profile.role||""))return NextResponse.json({error:"Agency access required."},{status:403});
 const clientId=new URL(request.url).searchParams.get("client_id");const query=(supabase as any).from("meta_ad_connections").select("id,client_id,ad_account_id,ad_account_name,access_token_ciphertext,token_iv").eq("sync_status","connected");if(clientId&&clientId!=="all")query.eq("client_id",clientId);
 const {data:connections,error}=await query;if(error)return NextResponse.json({error:error.message},{status:500});
 const {version}=metaConfig();const results:any[]=[];const errors:string[]=[];
 for(const c of connections||[]){try{const token=decryptMetaToken(c.access_token_ciphertext,c.token_iv);const u=new URL("https://graph.facebook.com/"+version+"/"+encodeURIComponent(c.ad_account_id)+"/ads");u.searchParams.set("fields","id,name,status,effective_status,campaign{name,status,effective_status},adset{name,status,effective_status}");u.searchParams.set("limit","500");u.searchParams.set("access_token",token);const response=await fetch(u,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Meta active ads request failed");for(const ad of data.data||[])results.push({client_id:c.client_id,ad_account_id:c.ad_account_id,ad_account_name:c.ad_account_name,...ad});}catch(e){errors.push(c.ad_account_name+": "+(e instanceof Error?e.message:"Unable to load ads"));}}
 return NextResponse.json({ads:results,errors,checked_at:new Date().toISOString()});
}
