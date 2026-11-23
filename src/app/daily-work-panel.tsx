"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, CheckCircle2, ClipboardList, Loader2, Plus, RefreshCw, UserRound } from "lucide-react";

type WorkTask = { id:string; title:string; description:string|null; client_name:string|null; assigned_to:string|null; status:string; priority:string; due_date:string|null; category:string|null; content_item_id:string|null; task_template_id:string|null };
type Person = { id:string; full_name:string; role:string };
type Client = { id:string; name:string };
type Template = { id:string; title:string; client_id:string|null; assigned_to:string|null; is_active:boolean; category:string|null };
const today = () => new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata"}).format(new Date());
const managers = ["ceo","operations_manager","team_lead","office_admin"];

export default function DailyWorkPanel({role,userId}:{role:string;userId:string}) {
  const db=useMemo(()=>createClient(),[]);
  const [tasks,setTasks]=useState<WorkTask[]>([]);
  const [people,setPeople]=useState<Person[]>([]);
  const [clients,setClients]=useState<Client[]>([]);
  const [templates,setTemplates]=useState<Template[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [showForm,setShowForm]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const manager=managers.includes(role);
  const day=today();

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    const generated=await db.rpc("sdma_generate_daily_template_tasks",{p_day:day});
    if(generated.error)setError(generated.error.message);
    const [taskRes,staffRes,clientRes,templateRes]=await Promise.all([
      db.from("tasks").select("id,title,description,client_name,assigned_to,status,priority,due_date,category,content_item_id,task_template_id").eq("due_date",day).order("priority",{ascending:false}),
      manager?db.from("profiles").select("id,full_name,role").eq("is_active",true).order("full_name"):Promise.resolve({data:[],error:null} as any),
      manager?db.from("clients").select("id,name").order("name"):Promise.resolve({data:[],error:null} as any),
      manager?db.from("task_templates").select("id,title,client_id,assigned_to,is_active,category").order("created_at",{ascending:false}):Promise.resolve({data:[],error:null} as any)
    ]);
    if(taskRes.error)setError(taskRes.error.message);
    setTasks((taskRes.data||[]) as WorkTask[]);
    setPeople((staffRes.data||[]) as Person[]);
    setClients((clientRes.data||[]) as Client[]);
    setTemplates((templateRes.data||[]) as Template[]);
    setLoading(false);
  },[db,day,manager]);

  useEffect(()=>{void load();},[load]);

  async function assign(task:WorkTask,personId:string) {
    setError("");setNotice("");
    const {error:e}=await db.from("tasks").update({assigned_to:personId||null}).eq("id",task.id);
    if(e)setError(e.message);else{setNotice("Task assignment updated.");await load();}
  }

  async function createDailyTemplate(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=new FormData(event.currentTarget);
    const title=String(form.get("title")||"").trim();
    if(!title)return;
    setSaving(true);setError("");setNotice("");
    const clientId=String(form.get("client_id")||"")||null;
    const personId=String(form.get("assigned_to")||"")||null;
    const {error:e}=await db.from("task_templates").insert({
      title,description:String(form.get("description")||"").trim()||null,
      client_id:clientId,assigned_to:personId,
      priority:String(form.get("priority")||"medium"),
      category:String(form.get("category")||"Daily").trim()||"Daily",
      created_by:userId,frequency:"daily",is_active:true
    });
    if(e)setError(e.message);
    else{setNotice("Daily recurring task saved. It will appear automatically in the morning To-do list.");setShowForm(false);event.currentTarget.reset();await load();}
    setSaving(false);
  }

  async function toggleTemplate(template:Template) {
    const {error:e}=await db.from("task_templates").update({is_active:!template.is_active}).eq("id",template.id);
    if(e)setError(e.message);else await load();
  }

  const open=tasks.filter(t=>t.status!=="completed");
  const done=tasks.filter(t=>t.status==="completed");
  const nameFor=(id:string|null)=>people.find(p=>p.id===id)?.full_name||"Unassigned";

  return <section className="panel daily-work-panel">
    <div className="panel-head"><div><h3>Today's Client Work & To-do</h3><p>{new Date(day+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"2-digit",month:"long"})} · Content calendar + recurring daily tasks</p></div><div className="tasks-actions"><button className="secondary-action" onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/> Refresh</button>{manager&&<button className="primary-action" onClick={()=>setShowForm(v=>!v)}><Plus size={14}/> Add Daily Task</button>}</div></div>
    <div className="client-summary"><div><span>Today's work</span><b>{tasks.length}</b><small>All scheduled tasks</small></div><div><span>To do / in progress</span><b>{open.length}</b><small>Needs action</small></div><div><span>Completed</span><b>{done.length}</b><small>Finished today</small></div></div>
    {error&&<p className="task-alert error">{error}</p>}{notice&&<p className="task-alert success">{notice}</p>}
    {showForm&&manager&&<form className="task-form" onSubmit={createDailyTemplate}>
      <div className="task-form-heading"><b>Create a recurring daily task</b><button type="button" onClick={()=>setShowForm(false)}>Close</button></div>
      <label>Task title<input name="title" required placeholder="e.g. Check all active client Meta campaigns"/></label>
      <label>Details<textarea name="description" rows={2} placeholder="What needs to be checked or completed?"/></label>
      <div className="task-form-grid">
        <label>Client (optional)<select name="client_id" defaultValue=""><option value="">Agency-wide task</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Assign to (optional)<select name="assigned_to" defaultValue=""><option value="">Unassigned</option>{people.map(p=><option key={p.id} value={p.id}>{p.full_name||p.role}</option>)}</select></label>
        <label>Priority<select name="priority" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
        <label>Category<input name="category" defaultValue="Daily"/></label>
      </div>
      <button className="primary-action" type="submit" disabled={saving}>{saving?<Loader2 className="spin" size={15}/>:<Plus size={15}/>} Save Daily Task</button>
    </form>}
    {loading?<div className="task-empty"><Loader2 className="spin" size={20}/> Loading today's work…</div>:tasks.length===0?<div className="task-empty"><CalendarDays size={26}/><b>No work scheduled for today</b><span>Content calendar items and saved Daily Tasks will appear here automatically.</span></div>:
      <div className="daily-work-list">{tasks.map(task=><article className="content-card" key={task.id}>
        <div className="content-card-top"><div className="content-title"><b>{task.title}</b><span className={"content-status status-"+(task.status==="completed"?"published":"planned")}>{task.status==="completed"?"Completed":task.status==="in_progress"?"In progress":"To do"}</span></div><span className="content-client">{task.client_name||"Agency-wide"}</span></div>
        {task.description&&<p className="content-caption">{task.description}</p>}
        <div className="content-meta"><span>{task.category||"Task"}</span><span className={"priority priority-"+task.priority}>{task.priority}</span><span><UserRound size={13}/>{nameFor(task.assigned_to)}</span>{task.content_item_id&&<span>From Content Calendar</span>}{task.task_template_id&&<span>Daily recurring</span>}</div>
        {manager&&task.status!=="completed"&&<div className="content-actions"><label>Assign team member<select value={task.assigned_to||""} onChange={e=>void assign(task,e.target.value)}><option value="">Unassigned</option>{people.map(p=><option key={p.id} value={p.id}>{p.full_name||p.role}</option>)}</select></label></div>}
      </article>)}</div>}
    {manager&&templates.length>0&&<div className="daily-template-list"><div className="panel-head"><div><h3>Saved Daily Tasks</h3><p>Manage recurring tasks without recreating them each day</p></div><ClipboardList size={17}/></div>{templates.map(t=><div className="daily-template-row" key={t.id}><div><b>{t.title}</b><small>{t.category||"Daily"} · {t.is_active?"Auto-added every day":"Paused"}</small></div><button className="secondary-action" onClick={()=>void toggleTemplate(t)}>{t.is_active?"Pause":"Activate"}</button></div>)}</div>}
  </section>;
}
