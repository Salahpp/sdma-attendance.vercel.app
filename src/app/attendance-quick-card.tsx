"use client";
import {useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {Clock3,LogIn,LogOut,Camera} from "lucide-react";
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata"}).format(new Date());}
export default function AttendanceQuickCard({userId,onOpen}:{userId:string;onOpen:()=>void}){
 const db=useMemo(()=>createClient(),[]);const [row,setRow]=useState<any>(null);const [now,setNow]=useState(Date.now());
 useEffect(()=>{let active=true;void db.from("attendance").select("check_in,check_out,status").eq("user_id",userId).eq("attendance_date",today()).maybeSingle().then(({data})=>{if(active)setRow(data);});const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>{active=false;window.clearInterval(timer);};},[db,userId]);
 const started=row?.check_in?new Date(row.check_in).getTime():0;const elapsed=started?Math.max(0,(new Date(row?.check_out||now).getTime()-started)/1000):0;const h=Math.floor(elapsed/3600),m=Math.floor((elapsed%3600)/60),s=Math.floor(elapsed%60);
 return <section className="attendance-quick-card"><div className="quick-attendance-icon"><Clock3 size={20}/></div><div className="quick-attendance-copy"><span>Today's attendance</span><b>{row?.check_out?"Shift completed":row?.check_in?"You're working":"Not punched in"}</b><strong>{started?h+"h "+m+"m "+s+"s":"00h 00m 00s"}</strong><small>{row?.check_in?"Started at "+new Date(row.check_in).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"}):"Punch in to start your work session"}</small></div><button className="primary-action" onClick={onOpen}>{row?.check_in&&!row?.check_out?<LogOut size={15}/>:<Camera size={15}/>} {row?.check_in&&!row?.check_out?"Punch out":"Punch attendance"}</button></section>;
}