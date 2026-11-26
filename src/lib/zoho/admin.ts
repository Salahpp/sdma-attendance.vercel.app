import { createClient } from "@supabase/supabase-js";
export function zohoAdmin(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Supabase service configuration is missing.");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}
export function zohoAccountsUrl(){return process.env.ZOHO_ACCOUNTS_URL||"https://accounts.zoho.in";}
export function zohoApiUrl(){return process.env.ZOHO_API_URL||"https://www.zohoapis.in/books/v3";}
