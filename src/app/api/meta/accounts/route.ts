import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptMetaToken,metaConfig } from "@/lib/meta-crypto";
export const runtime="nodejs";
export async function GET(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const clientId=new URL(request.url).searchParams.get("client_id");if(!clientId)return NextResponse.json({error:"client_id is required."},{status:400});
 const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();if(!profile?.is_active||!["ceo","operations_manager"].includes(profile.role||""))return NextResponse.json({error:"Agency administrator access required."},{status:403});
 const {data:row,error}=await (supabase as any).from("meta_oauth_tokens").select("token_ciphertext,token_iv,token_expires_at").eq("user_id",user.id).eq("client_id",clientId).maybeSingle();if(error||!row)return NextResponse.json({error:"Connect this client's Meta account first."},{status:404});
 if(row.token_expires_at&&new Date(row.token_expires_at)<new Date())return NextResponse.json({error:"Meta authorization expired. Reconnect this client."},{status:401});
 try{const token=decryptMetaToken(row.token_ciphertext,row.token_iv);const {version}=metaConfig();const endpoint=new URL("https://graph.facebook.com/"+version+"/me/adaccounts");endpoint.searchParams.set("fields","id,name,account_id,currency,account_status");endpoint.searchParams.set("limit","200");endpoint.searchParams.set("access_token",token);const response=await fetch(endpoint,{cache:"no-store"});const data=await response.json();if(!response.ok)return NextResponse.json({error:data.error?.message||"Could not load Ad Accounts."},{status:502});return NextResponse.json({accounts:data.data||[]})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Meta account lookup failed."},{status:500})}
}
