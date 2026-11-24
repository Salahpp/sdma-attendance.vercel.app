import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptMetaToken,encryptMetaToken,metaConfig } from "@/lib/meta-crypto";
export const runtime="nodejs";
export async function POST(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();if(!profile?.is_active||!["ceo","operations_manager"].includes(profile.role||""))return NextResponse.json({error:"Agency administrator access required."},{status:403});
 let body:{client_id?:string;account_id?:string};try{body=await request.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
 if(!body.client_id||!body.account_id)return NextResponse.json({error:"Client and Ad Account are required."},{status:400});
 const {data:pending,error}=await (supabase as any).from("meta_oauth_tokens").select("*").eq("user_id",user.id).eq("client_id",body.client_id).maybeSingle();if(error||!pending)return NextResponse.json({error:"Connect Meta first."},{status:404});
 try{const token=decryptMetaToken(pending.token_ciphertext,pending.token_iv);const {version}=metaConfig();const endpoint=new URL("https://graph.facebook.com/"+version+"/"+encodeURIComponent(body.account_id));endpoint.searchParams.set("fields","id,name,account_id,currency,account_status");endpoint.searchParams.set("access_token",token);const response=await fetch(endpoint,{cache:"no-store"});const account=await response.json();if(!response.ok)return NextResponse.json({error:account.error?.message||"Ad Account verification failed."},{status:400});
 const encrypted=encryptMetaToken(token);const {error:saveError}=await (supabase as any).from("meta_ad_connections").upsert({client_id:body.client_id,ad_account_id:String(account.id),ad_account_name:account.name||account.account_id,access_token_ciphertext:encrypted.token_ciphertext,token_iv:encrypted.token_iv,token_expires_at:pending.token_expires_at,granted_scopes:["ads_read"],connected_by:user.id,sync_status:"connected"},{onConflict:"client_id,ad_account_id"});if(saveError)throw saveError;
 return NextResponse.json({success:true,account:{id:account.id,name:account.name,currency:account.currency}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not save Ad Account connection."},{status:500})}
}
