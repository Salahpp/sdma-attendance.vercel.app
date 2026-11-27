import {NextRequest,NextResponse} from "next/server";
import {requireProfile} from "@/lib/auth/profile";
const allowed=["ceo","operations_manager","accounts"];
function back(req:NextRequest,message:string){const u=new URL("/",req.url);u.searchParams.set("accounts_error",message);const r=NextResponse.redirect(u);r.cookies.delete("zoho_oauth_state");return r;}
export async function GET(req:NextRequest){
 const {profile}=await requireProfile();if(!allowed.includes(profile.role))return NextResponse.redirect(new URL("/access-denied",req.url));
 const params=req.nextUrl.searchParams,code=params.get("code"),state=params.get("state"),zohoError=params.get("error"),cookie=req.cookies.get("zoho_oauth_state")?.value;
 if(zohoError)return back(req,params.get("error_description")||zohoError);
 if(!code)return back(req,"Zoho did not return an authorization code. Restart Connect Zoho from Accounts.");
 if(!state)return back(req,"OAuth state parameter missing. Restart Connect Zoho from Accounts.");
 if(!cookie)return back(req,"OAuth state cookie missing. Enable cookies and restart Zoho connection from the same browser/domain.");
 if(state!==cookie)return back(req,"OAuth state mismatch. Restart Zoho connection; do not reuse an old consent tab.");
 const client=process.env.ZOHO_CLIENT_ID,secret=process.env.ZOHO_CLIENT_SECRET,redirect=process.env.ZOHO_REDIRECT_URI,base=process.env.ZOHO_ACCOUNTS_URL||"https://accounts.zoho.in";
 if(!client||!secret||!redirect)return back(req,"OAuth configuration missing on server.");
 let tokenRes:Response,token:any;try{tokenRes=await fetch(base+"/oauth/v2/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"authorization_code",client_id:client,client_secret:secret,redirect_uri:redirect,code}),cache:"no-store"});token=await tokenRes.json()}catch{return back(req,"Could not contact Zoho token service. Please retry.");}
 if(!tokenRes.ok||!token.refresh_token)return back(req,token.error||"Zoho token exchange failed. Reconnect and grant offline access.");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return back(req,"Server storage configuration missing.");
 const saved=await fetch(url+"/rest/v1/zoho_connections",{method:"POST",headers:{apikey:key,authorization:"Bearer "+key,"content-type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({id:"primary",refresh_token:token.refresh_token,api_domain:token.api_domain||process.env.ZOHO_API_URL||"https://www.zohoapis.in",accounts_domain:base,updated_at:new Date().toISOString()}),cache:"no-store"});
 if(!saved.ok)return back(req,"Zoho connected, but saving the connection failed. Check the zoho_connections database table.");
 const response=NextResponse.redirect(new URL("/?accounts=connected",req.url));response.cookies.delete("zoho_oauth_state");return response;
}