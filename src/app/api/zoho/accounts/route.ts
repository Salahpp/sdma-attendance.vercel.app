import {requireProfile} from "@/lib/auth/profile";import {NextRequest,NextResponse} from "next/server";
const allowed=["ceo","operations_manager","accounts"];
async function getTokens(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error("Server storage configuration missing");
 const r=await fetch(url+"/rest/v1/zoho_connections?id=eq.primary&select=*",{headers:{apikey:key,authorization:"Bearer "+key},cache:"no-store"});const rows=await r.json();if(!rows?.[0]?.refresh_token)throw Error("Zoho Books is not connected");const row=rows[0];
 const refresh=await fetch(row.accounts_domain+"/oauth/v2/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"refresh_token",client_id:process.env.ZOHO_CLIENT_ID||"",client_secret:process.env.ZOHO_CLIENT_SECRET||"",refresh_token:row.refresh_token}),cache:"no-store"});const t=await refresh.json();if(!t.access_token)throw Error(t.error||"Token refresh failed");
 return {token:t.access_token,api:row.api_domain};
}
export async function GET(req:NextRequest){const {profile}=await requireProfile();if(!allowed.includes(profile.role))return NextResponse.json({error:"Access denied"},{status:403});
 try{const {token,api}=await getTokens();const orgRes=await fetch(api+"/books/v3/organizations",{headers:{Authorization:"Zoho-oauthtoken "+token},cache:"no-store"});const orgs=await orgRes.json();const org=orgs.organizations?.[0];if(!org)return NextResponse.json({connected:true,data:{},organization:""}, {status:200});
 const now=new Date(),start=req.nextUrl.searchParams.get("period")==="year"?now.getFullYear()+"-01-01":new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10),end=now.toISOString().slice(0,10),report=req.nextUrl.searchParams.get("report")||"profitloss";
 const [invoices,expenses,receivables]=await Promise.all(["invoices","expenses","invoices"].map((path,i)=>fetch(api+"/books/v3/"+path+"?organization_id="+org.organization_id+(i===2?"&status=overdue":""),{headers:{Authorization:"Zoho-oauthtoken "+token},cache:"no-store"}).then(r=>r.json())));
 const inv=invoices.invoices||[],exp=expenses.expenses||[],rev=inv.reduce((s:number,x:any)=>s+Number(x.total||0),0),expenseTotal=exp.reduce((s:number,x:any)=>s+Number(x.total||x.amount||0),0),out=(receivables.invoices||[]).reduce((s:number,x:any)=>s+Number(x.balance||0),0);
 const reportData=report==="invoices"?inv:report==="expenses"?exp:report==="receivables"?(receivables.invoices||[]):{revenue:rev,expenses:expenseTotal,profit:rev-expenseTotal,receivables:out,reportName:report};
 return NextResponse.json({connected:true,organization:org.name,lastSync:new Date().toISOString(),data:{revenue:rev,expenses:expenseTotal,profit:rev-expenseTotal,receivables:out,report:reportData,items:reportData}});
 }catch(e:any){return NextResponse.json({error:e.message||"Zoho request failed"},{status:400})}}
