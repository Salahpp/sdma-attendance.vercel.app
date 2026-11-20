"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, RefreshCw, Loader2, Send, Users } from "lucide-react";

type Leave={id:string;user_id:string;leave_type:string;start_date:string;end_date:string;reason:string|null;status:string;reviewed_by:string|null;created_at:string};
type Person={id:string;full_name:string};
export default function LeavePanel({userId,role}:{userId:string;role:string}) {
  const supabase=useMemo(()=>createClient(),[]);
  const manager=["ceo","operations_manager","team_lead","office_admin"].includes(role);
  const [mine,setMine]=useState<Leave[]>([]);
  const [all,setAll]=useState<Leave[]>([]);
  const [people,setPeople]=useState<Person[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const load=useCallback(async()=>{
    setLoading(true);setError("");
    const [m,a,p]=await Promise.all([
      supabase.from("leave_requests").select("*").eq("user_id",userId).order("created_at",{ascending:false}),
      manager?supabase.from("leave_requests").select("*").order("created_at",{ascending:false}):Promise.resolve({data:[],error:null}),
      manager?supabase.from("profiles").select("id,full_name"):Promise.resolve({data:[],error:null})
    ]);
    if(m.error)setError(m.error.message);else setMine((m.data??[]) as Leave[]);
    if(a.error)setError(a.error.message);else setAll((a.data??[]) as Leave[]);
    if(p.error)setError(p.error.message);else setPeople((p.data??[]) as Person[]);
    setLoading(false);
  },[supabase,userId,manager]);
  useEffect(()=>{void load();},[load]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setSaving(true);setError("");setNotice("");
    const form=new FormData(event.currentTarget);
    const start=String(form.get("start_date")||"");const end=String(form.get("end_date")||"");
    if(!start||!end||end<start){setError("Please select a valid leave date range.");setSaving(false);return;}
    const payload={user_id:userId,leave_type:String(form.get("leave_type")||"casual"),start_date:start,end_date:end,reason:String(form.get("reason")||"").trim()||null};
    const {error}=await supabase.from("leave_requests").insert(payload);
    if(error)setError(error.message);else{setNotice("Leave request submitted.");event.currentTarget.reset();await load();}
    setSaving(false);
  }
  async function review(row:Leave,status:"approved"|"rejected"){
    const {error}=await supabase.from("leave_requests").update({status,reviewed_by:userId,reviewed_at:new Date().toISOString()}).eq("id",row.id);
    if(error)setError(error.message);else{setNotice("Leave request "+status+".");await load();}
  }
  const personName=(id:string)=>people.find(p=>p.id===id)?.full_name||"Team member";
  return <section className="leave-workspace">
    <div className="tasks-toolbar"><div><h2>Leave Management</h2><p>Apply for leave and review team requests.</p></div><button className="secondary-action" onClick={()=>void load()}><RefreshCw size={15}/> Refresh</button></div>
    <form className="task-form" onSubmit={submit}><div className="task-form-heading"><b>New leave request</b><CalendarDays size={17}/></div>
      <div className="task-form-grid"><label>Leave type<select name="leave_type"><option value="casual">Casual leave</option><option value="sick">Sick leave</option><option value="annual">Annual leave</option><option value="unpaid">Unpaid leave</option><option value="other">Other</option></select></label><label>Start date<input name="start_date" type="date" required/></label><label>End date<input name="end_date" type="date" required/></label><label>Reason<input name="reason" placeholder="Optional reason"/></label></div>
      <button className="primary-action" disabled={saving}>{saving?<Loader2 className="spin" size={15}/>:<Send size={15}/>} Submit request</button>
    </form>
    {error&&<p className="task-alert error">{error}</p>}{notice&&<p className="task-alert success">{notice}</p>}
    <section className="team-reports"><div className="panel-head"><div><h3>{manager?"Team leave requests":"My leave requests"}</h3><p>{manager?"All staff submissions":"Your submitted requests"}</p></div><Users size={18}/></div>
      {loading?<div className="task-empty"><Loader2 className="spin" size={20}/></div>:(manager?all:mine).length===0?<div className="task-empty">No leave requests found.</div>:<div className="leave-list">{(manager?all:mine).map(row=><article key={row.id}><div><b>{manager?personName(row.user_id):row.leave_type.replaceAll("_"," ")}</b><small>{row.start_date} → {row.end_date} · {row.leave_type}</small>{row.reason&&<p>{row.reason}</p>}</div><span className={"leave-status "+row.status}>{row.status}</span>{manager&&row.status==="pending"&&<div className="leave-actions"><button onClick={()=>void review(row,"approved")}>Approve</button><button onClick={()=>void review(row,"rejected")}>Reject</button></div>}</article>)}</div>}
    </section>
  </section>;
}
