// Trigger Preview build after Meta sync typing fix.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptMetaToken,metaConfig } from "@/lib/meta-crypto";
export const runtime="nodejs";
export const maxDuration=60;
export async function POST(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();if(!profile?.is_active||!["ceo","operations_manager","team_lead","office_admin","digital_marketer"].includes(profile.role||""))return NextResponse.json({error:"Agency access required."},{status:403});
 let body:{client_id?:string;since?:string;until?:string};try{body=await request.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
 if(!body.client_id)return NextResponse.json({error:"Select a client."},{status:400});
 const {data:connection,error}=await (supabase as any).from("meta_ad_connections").select("*").eq("client_id",body.client_id).maybeSingle();if(error||!connection)return NextResponse.json({error:"No Meta Ad Account connected for this client."},{status:404});
 try{
  const token=decryptMetaToken(connection.access_token_ciphertext,connection.token_iv);const {version}=metaConfig();
  const now=new Date();const until=body.until||now.toISOString().slice(0,10);const start=new Date(now);start.setDate(start.getDate()-29);const since=body.since||start.toISOString().slice(0,10);
  const params=new URLSearchParams({level:"ad",time_increment:"1",time_range:JSON.stringify({since,until}),fields:"campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,date_start,date_stop,impressions,reach,clicks,spend,inline_link_clicks,actions,cost_per_action_type",limit:"500",access_token:token});
  let next:string|null="https://graph.facebook.com/"+version+"/"+encodeURIComponent(connection.ad_account_id)+"/insights?"+params.toString();let rows:any[]=[];let pages=0;
  while(next&&pages<20){const response: Response = await fetch(next,{cache:"no-store"});const data: any = await response.json();if(!response.ok)throw new Error(data.error?.message||"Meta Insights request failed.");rows=rows.concat(data.data||[]);next=data.paging?.next||null;pages++}
  const records=rows.map(x=>({connection_id:connection.id,client_id:connection.client_id,ad_account_id:connection.ad_account_id,campaign_id:x.campaign_id||null,campaign_name:x.campaign_name||null,adset_id:x.adset_id||null,adset_name:x.adset_name||null,ad_id:x.ad_id||null,ad_name:x.ad_name||null,date_start:x.date_start,date_stop:x.date_stop,impressions:Number(x.impressions||0),reach:Number(x.reach||0),clicks:Number(x.clicks||0),spend:Number(x.spend||0),inline_link_clicks:Number(x.inline_link_clicks||0),actions:x.actions||[],cost_per_action_type:x.cost_per_action_type||[],updated_at:new Date().toISOString()}));
  if(records.length){const {error:saveError}=await (supabase as any).from("meta_ad_insights").upsert(records,{onConflict:"connection_id,ad_id,date_start,date_stop"});if(saveError)throw new Error(saveError.message)}
  await (supabase as any).from("meta_ad_connections").update({last_synced_at:new Date().toISOString(),sync_status:"connected",last_error:null}).eq("id",connection.id);
  return NextResponse.json({success:true,rows:records.length,since,until,account:connection.ad_account_name});
 }catch(e){const message=e instanceof Error?e.message:"Meta report sync failed.";await (supabase as any).from("meta_ad_connections").update({sync_status:"error",last_error:message}).eq("id",connection.id);return NextResponse.json({error:message},{status:502})}
}
