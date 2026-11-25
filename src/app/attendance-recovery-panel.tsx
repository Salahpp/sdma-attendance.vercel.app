"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {RefreshCw,ShieldAlert,Clock3,Loader2} from "lucide-react";
type Session={id:string;user_id:string;attendance_date:string;check_in:string;check_out:string|null};
type Person={id:string;full_name:string;role:string};
export default function AttendanceRecoveryPanel({role}:{role:string}){
 const db=useMemo(()=>createClient() as any,[]);
 const allowed=["ceo","operations_manager","team_lead","office_admin"].includes(role);
 const [rows,setRows]=useState<Session[]>([]);const [people,setPeople]=useState<Person[]>([]);
 const [busy,setBusy]=useState<string|null>(null);const [error,setError]=useState("");const [message,setMessage]=useState("");
 const load=useCallback(async()=>{setError("");const [a,p]=await Promise.all([db.from("attendance_sessions").select("id,user_id,attendance_date,check_in,check_out").is("check_out",null).order("attendance_date",{ascending:true}),db.from("profiles").select("id,full_name,role").eq("is_active",true)]);if(a.error){setError(a.error.message);return;}setRows((a.data||[]) as Session[]);setPeople((p.data||[]) as Person[]);},[db]);
 useEffect(()=>{if(allowed)void load();},[allowed,load]);
 if(!allowed)return null;
 const closeSession=async(row:Session)=>{setError("");setMessage("");setBusy(row.id);const stamp=new Date();if(stamp<=new Date(row.check_in)){setError("Current time is earlier than check-in.");setBusy(null);return;}const reason="Admin manual checkout via Attendance Recovery Center.";const result=await db.rpc("sdma_admin_manual_checkout_session",{p_session_id:row.id,p_checkout:stamp.toISOString(),p_reason:reason});if(result.error){setError(result.error.message);setBusy(null);return;}setMessage("Session closed at "+stamp.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})+" and audit record saved.");setBusy(null);await load();};
 return <section className="team-attendance" style={{marginTop:24}}><div className="panel-head"><div><h3>Attendance Recovery Center</h3><p>Close forgotten or stuck sessions with one tap.</p></div><button className="secondary-action" onClick={()=>void load()}><RefreshCw size={15}/> Refresh</button></div>{error&&<p className="task-alert error">{error}</p>}{message&&<p className="task-alert success">{message}</p>}{rows.length===0?<div className="task-empty"><Clock3 size={18}/> No open attendance sessions found.</div>:rows.map(row=>{const person=people.find(p=>p.id===row.user_id);return <article key={row.id} style={{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:12}}><div style={{display:"grid",gap:4}}><b>{person?.full_name||"Staff member"}</b><small>{row.attendance_date} · In: {new Date(row.check_in).toLocaleTimeString("en-IN",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit"})}</small><span className="attendance-live">Open session</span></div><button className="primary-action" disabled={busy===row.id} onClick={()=>void closeSession(row)}>{busy===row.id?<Loader2 className="spin" size={15}/>:<ShieldAlert size={15}/>} {busy===row.id?"Closing…":"Manual checkout · now"}</button></article>;})}</section>;
}
