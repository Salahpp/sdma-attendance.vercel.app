"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ClipboardList, RefreshCw, Loader2, Send, Users } from "lucide-react";

type Report={id:string;user_id:string;report_date:string;report_type:"morning"|"evening";planned_tasks:string|null;completed_tasks:string|null;blockers:string|null;leads_count:number;notes:string|null;created_at:string};
type Person={id:string;full_name:string;role:string};
const today=()=>{const p=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const v=(k:string)=>p.find(x=>x.type===k)?.value||"";return v("year")+"-"+v("month")+"-"+v("day");};

export default function DailyReportsPanel({userId,role}:{userId:string;role:string}) {
  const supabase=useMemo(()=>createClient(),[]);
  const [type,setType]=useState<"morning"|"evening">("morning");
  const [own,setOwn]=useState<Report[]>([]);
  const [team,setTeam]=useState<Report[]>([]);
  const [people,setPeople]=useState<Person[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const manager=["ceo","operations_manager","team_lead","office_admin"].includes(role);

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    const [mine,teamReports,profiles]=await Promise.all([
      supabase.from("daily_reports").select("*").eq("user_id",userId).eq("report_date",today()).order("created_at"),
      manager?supabase.from("daily_reports").select("*").eq("report_date",today()).order("created_at",{ascending:false}):Promise.resolve({data:[],error:null}),
      manager?supabase.from("profiles").select("id,full_name,role").eq("is_active",true):Promise.resolve({data:[],error:null})
    ]);
    if(mine.error)setError(mine.error.message);else setOwn((mine.data??[]) as Report[]);
    if(teamReports.error)setError(teamReports.error.message);else setTeam((teamReports.data??[]) as Report[]);
    if(profiles.error)setError(profiles.error.message);else setPeople((profiles.data??[]) as Person[]);
    setLoading(false);
  },[supabase,userId,manager]);
  useEffect(()=>{void load();},[load]);

  const current=own.find(r=>r.report_type===type);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setSaving(true);setError("");setNotice("");
    const form=new FormData(event.currentTarget);
    const payload={user_id:userId,report_date:today(),report_type:type,
      planned_tasks:String(form.get("planned_tasks")||"").trim()||null,
      completed_tasks:String(form.get("completed_tasks")||"").trim()||null,
      blockers:String(form.get("blockers")||"").trim()||null,
      leads_count:Math.max(0,Number(form.get("leads_count")||0)),
      notes:String(form.get("notes")||"").trim()||null
    };
    const {error}=await supabase.from("daily_reports").upsert(payload,{onConflict:"user_id,report_date,report_type"});
    if(error)setError(error.message);else{setNotice(type==="morning"?"Morning report submitted.":"Evening report submitted.");await load();}
    setSaving(false);
  }
  const personName=(id:string)=>people.find(p=>p.id===id)?.full_name||"Team member";

  return <section className="reports-workspace">
    <div className="tasks-toolbar"><div><h2>Daily Reports</h2><p>Submit your morning plan and evening work summary.</p></div><button className="secondary-action" onClick={()=>void load()}><RefreshCw size={15}/> Refresh</button></div>
    <div className="report-tabs"><button className={type==="morning"?"active":""} onClick={()=>setType("morning")}>Morning report</button><button className={type==="evening"?"active":""} onClick={()=>setType("evening")}>Evening report</button></div>
    <form className="task-form" onSubmit={submit}>
      <div className="task-form-heading"><b>{type==="morning"?"Today’s work plan":"Today’s work summary"}</b><span>{today()}</span></div>
      <label>{type==="morning"?"Planned tasks":"Tasks completed"}<textarea name={type==="morning"?"planned_tasks":"completed_tasks"} rows={4} defaultValue={type==="morning"?current?.planned_tasks||"":current?.completed_tasks||""} placeholder={type==="morning"?"List your key tasks for today…":"Summarise completed work and deliverables…"} /></label>
      <label>Blockers / Issues<textarea name="blockers" rows={2} defaultValue={current?.blockers||""} placeholder="Any delays, approvals or support needed?"/></label>
      <div className="task-form-grid"><label>Leads handled today<input name="leads_count" type="number" min="0" defaultValue={current?.leads_count||0}/></label><label>Additional notes<input name="notes" defaultValue={current?.notes||""} placeholder="Optional notes"/></label></div>
      <button className="primary-action" disabled={saving}>{saving?<Loader2 className="spin" size={15}/>:<Send size={15}/>} {saving?"Submitting…":current?"Update report":"Submit report"}</button>
      {error&&<p className="task-alert error">{error}</p>}{notice&&<p className="task-alert success">{notice}</p>}
    </form>
    {manager&&<section className="team-reports"><div className="panel-head"><div><h3>Team submissions</h3><p>Reports received today</p></div><Users size={18}/></div>{loading?<div className="task-empty"><Loader2 className="spin" size={20}/></div>:team.length===0?<div className="task-empty">No team reports submitted yet.</div>:<div className="team-report-list">{team.map(r=><article key={r.id}><div><b>{personName(r.user_id)}</b><small>{r.report_type==="morning"?"Morning":"Evening"} · {r.created_at?new Date(r.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}):""}</small></div><p>{r.report_type==="morning"?r.planned_tasks:r.completed_tasks||"No task details added"}</p>{r.blockers&&<small className="report-blocker">Blocker: {r.blockers}</small>}<span>{r.leads_count} leads</span></article>)}</div>}</section>}
    <p className="staff-footnote"><ClipboardList size={13}/> You can update your report during the day. Managers can review submissions from active team members.</p>
  </section>;
}
