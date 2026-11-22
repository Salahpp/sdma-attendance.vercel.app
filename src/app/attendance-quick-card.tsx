"use client";
import {useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {Clock3,LogOut,Camera,RefreshCw} from "lucide-react";
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata"}).format(new Date());}
function clock(value:string){return new Date(value).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"});}
export default function AttendanceQuickCard({userId,onOpen}:{userId:string;onOpen:()=>void}){
 const db=useMemo(()=>createClient(),[]);
 const [row,setRow]=useState<any>(null);
 const [now,setNow]=useState(Date.now());
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;
  const load=async()=>{
   setError("");
   const {data,error}=await db.from("attendance").select("check_in,check_out,status").eq("user_id",userId).eq("attendance_date",today()).maybeSingle();
   if(!active)return;
   if(error)setError("Attendance status unavailable");
   else setRow(data);
   setLoading(false);
  };
  void load();
  const timer=window.setInterval(()=>setNow(Date.now()),1000);
  const refresh=window.setInterval(()=>void load(),60000);
  return()=>{active=false;window.clearInterval(timer);window.clearInterval(refresh);};
 },[db,userId]);
 const started=row?.check_in?new Date(row.check_in).getTime():0;
 const elapsed=started?Math.max(0,(new Date(row?.check_out||now).getTime()-started)/1000):0;
 const h=Math.floor(elapsed/3600),m=Math.floor((elapsed%3600)/60),s=Math.floor(elapsed%60);
 const working=Boolean(row?.check_in&&!row?.check_out);
 const completed=Boolean(row?.check_in&&row?.check_out);
 return <section className="attendance-quick-card" aria-label="Today's attendance">
  <div className="quick-attendance-icon"><Clock3 size={20}/></div>
  <div className="quick-attendance-copy" aria-live="polite">
   <span>Today's attendance · IST</span>
   <b>{loading?"Checking attendance…":error|| (completed?"Shift completed":working?"You're working":"Not punched in")}</b>
   <strong>{loading?"—":started?h+"h "+m+"m "+s+"s":"00h 00m 00s"}</strong>
   <small>{row?.check_in?"Started at "+clock(row.check_in):"Punch in with a selfie and GPS to start your work session"}</small>
  </div>
  <button className="primary-action" onClick={onOpen} disabled={loading||Boolean(error)||completed}>
   {working?<LogOut size={15}/>:<Camera size={15}/>}
   {loading?"Loading…":completed?"Attendance completed":working?"Punch out":"Punch attendance"}
  </button>
  {error&&<button className="attendance-quick-retry" onClick={()=>window.location.reload()} aria-label="Reload attendance status"><RefreshCw size={14}/> Reload</button>}
 </section>;
}
