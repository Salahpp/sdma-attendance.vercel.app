"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, RefreshCw, BriefcaseBusiness, Mail, Phone, FolderKanban, Loader2,
  Pencil, X, Search, Users, CalendarClock, CheckCircle2, CircleDot, AlertTriangle,
  ChevronDown, ChevronUp, Building2, ListTodo, ExternalLink
} from "lucide-react";

type Client={id:string;name:string;contact_person:string|null;email:string|null;phone:string|null;service_package:string|null;status:string;notes:string|null;created_at:string};
type Project={id:string;client_id:string|null;name:string;description:string|null;status:string;start_date:string|null;due_date:string|null;created_at:string};
type Task={id:string;project_id:string|null;title:string;status:string;assigned_to:string|null;due_date:string|null;priority:string};
type Person={id:string;full_name:string;role:string};
const canEdit=(role:string)=>["ceo","operations_manager","team_lead","office_admin","accounts"].includes(role);
const projectStatuses=["active","on_hold","completed","cancelled"];
const dateLabel=(value:string|null)=>value?new Date(value+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"Not set";

export default function ClientsPanel({role}:{role:string}) {
  const supabase=useMemo(()=>createClient(),[]);
  const [clients,setClients]=useState<Client[]>([]);
  const [projects,setProjects]=useState<Project[]>([]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [people,setPeople]=useState<Person[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [showClient,setShowClient]=useState(false);
  const [editingClient,setEditingClient]=useState<Client|null>(null);
  const [projectFor,setProjectFor]=useState<string|null>(null);
  const [editingProject,setEditingProject]=useState<Project|null>(null);
  const [expandedClient,setExpandedClient]=useState<string|null>(null);
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const editable=canEdit(role);

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    const [c,p,t,staff]=await Promise.all([
      supabase.from("clients").select("*").order("created_at",{ascending:false}),
      supabase.from("projects").select("*").order("created_at",{ascending:false}),
      supabase.from("tasks").select("id,project_id,title,status,assigned_to,due_date,priority").limit(1000),
      supabase.from("profiles").select("id,full_name,role").eq("is_active",true).order("full_name")
    ]);
    const firstError=c.error||p.error||t.error||staff.error;
    if(firstError)setError(firstError.message);
    setClients((c.data??[]) as Client[]);
    setProjects((p.data??[]) as Project[]);
    setTasks((t.data??[]) as Task[]);
    setPeople((staff.data??[]) as Person[]);
    setLoading(false);
  },[supabase]);
  useEffect(()=>{void load();},[load]);

  function startCreateClient(){setEditingClient(null);setShowClient(true);setNotice("");}
  function startEditClient(client:Client){setEditingClient(client);setShowClient(true);setNotice("");}
  async function saveClient(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const formElement=event.currentTarget;const form=new FormData(formElement);
    setSaving(true);setError("");setNotice("");
    const payload={name:String(form.get("name")||"").trim(),contact_person:String(form.get("contact_person")||"").trim()||null,email:String(form.get("email")||"").trim()||null,phone:String(form.get("phone")||"").trim()||null,service_package:String(form.get("service_package")||"").trim()||null,notes:String(form.get("notes")||"").trim()||null,status:String(form.get("status")||"active")};
    if(!payload.name){setError("Client name is required.");setSaving(false);return;}
    const result=editingClient
      ? await supabase.from("clients").update(payload).eq("id",editingClient.id)
      : await supabase.from("clients").insert(payload);
    if(result.error)setError(result.error.message);
    else{setNotice(editingClient?"Client details updated.":"Client account created.");setShowClient(false);setEditingClient(null);await load();}
    setSaving(false);
  }

  function startProject(clientId:string,project?:Project){
    setProjectFor(clientId);setEditingProject(project||null);setNotice("");setError("");
  }
  async function saveProject(event:FormEvent<HTMLFormElement>,clientId:string){
    event.preventDefault();const form=new FormData(event.currentTarget);
    setSaving(true);setError("");setNotice("");
    const payload={client_id:clientId,name:String(form.get("name")||"").trim(),description:String(form.get("description")||"").trim()||null,start_date:String(form.get("start_date")||"")||null,due_date:String(form.get("due_date")||"")||null,status:String(form.get("status")||"active")};
    if(!payload.name){setError("Project name is required.");setSaving(false);return;}
    const result=editingProject
      ? await supabase.from("projects").update(payload).eq("id",editingProject.id)
      : await supabase.from("projects").insert(payload);
    if(result.error)setError(result.error.message);
    else{setNotice(editingProject?"Project updated.":"Project created.");setProjectFor(null);setEditingProject(null);await load();}
    setSaving(false);
  }

  async function updateClientStatus(client:Client,status:string){
    setError("");setNotice("");
    const {error}=await supabase.from("clients").update({status}).eq("id",client.id);
    if(error)setError(error.message);else{setNotice(client.name+" status updated.");await load();}
  }
  async function updateProjectStatus(project:Project,status:string){
    setError("");setNotice("");
    const {error}=await supabase.from("projects").update({status}).eq("id",project.id);
    if(error)setError(error.message);else{setNotice(project.name+" status updated.");await load();}
  }

  const filtered=clients.filter(c=>(statusFilter==="all"||c.status===statusFilter)&&[c.name,c.contact_person,c.email,c.phone,c.service_package,c.notes].some(v=>(v||"").toLowerCase().includes(search.toLowerCase())));
  const activeClients=clients.filter(c=>c.status==="active").length;
  const activeProjects=projects.filter(p=>!["completed","cancelled"].includes(p.status)).length;
  const overdueProjects=projects.filter(p=>p.due_date&&p.due_date<new Date().toISOString().slice(0,10)&&!["completed","cancelled"].includes(p.status)).length;
  const personName=(id:string|null)=>people.find(p=>p.id===id)?.full_name||"Unassigned";
  const taskStats=(projectId:string)=>{const linked=tasks.filter(t=>t.project_id===projectId);return {total:linked.length,done:linked.filter(t=>t.status==="completed").length,open:linked.filter(t=>t.status!=="completed").length,people:[...new Set(linked.map(t=>t.assigned_to).filter(Boolean) as string[])]};};

  return <section className="clients-workspace">
    <div className="tasks-toolbar">
      <div><h2>Clients & CRM</h2><p>Client accounts, project delivery and team workload in one place.</p></div>
      <div className="tasks-actions"><button className="secondary-action" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> Refresh</button>{editable&&<button className="primary-action" onClick={startCreateClient}><Plus size={15}/> Add client</button>}</div>
    </div>
    <div className="client-summary phase2-summary">
      <div><span>Active clients</span><b>{clients.length?activeClients:"—"}</b><small>of {clients.length} accounts</small></div>
      <div><span>Active projects</span><b>{projects.length?activeProjects:"—"}</b><small>{projects.length} total projects</small></div>
      <div><span>Overdue projects</span><b className={overdueProjects?"metric-danger":""}>{overdueProjects}</b><small>Due date passed · not completed</small></div>
      <div><span>Tasks linked to projects</span><b>{tasks.filter(t=>t.project_id).length}</b><small>Across all client projects</small></div>
    </div>

    <div className="crm-toolbar">
      <label className="crm-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search client, contact, email, service…"/></label>
      <div className="crm-filters" aria-label="Filter clients">
        {["all","active","paused","inactive"].map(value=><button key={value} className={statusFilter===value?"active":""} onClick={()=>setStatusFilter(value)}>{value==="all"?"All":value[0].toUpperCase()+value.slice(1)}</button>)}
      </div>
    </div>

    {error&&<p className="task-alert error">{error}</p>}{notice&&<p className="task-alert success">{notice}</p>}
    {showClient&&editable&&<form className="task-form crm-editor" onSubmit={saveClient}>
      <div className="task-form-heading"><b>{editingClient?"Edit client account":"New client account"}</b><button type="button" onClick={()=>{setShowClient(false);setEditingClient(null);}}><X size={15}/> Close</button></div>
      <div className="task-form-grid">
        <label>Client / Brand name<input name="name" required defaultValue={editingClient?.name||""} placeholder="Company name"/></label>
        <label>Contact person<input name="contact_person" defaultValue={editingClient?.contact_person||""} placeholder="Primary contact"/></label>
        <label>Email<input name="email" type="email" defaultValue={editingClient?.email||""} placeholder="client@example.com"/></label>
        <label>Phone<input name="phone" defaultValue={editingClient?.phone||""} placeholder="+91…"/></label>
        <label>Service package<input name="service_package" defaultValue={editingClient?.service_package||""} placeholder="Performance marketing, SEO…"/></label>
        <label>Account status<select name="status" defaultValue={editingClient?.status||"active"}><option value="active">Active</option><option value="paused">Paused</option><option value="inactive">Inactive</option></select></label>
        <label className="crm-notes-field">Internal notes<textarea name="notes" rows={3} defaultValue={editingClient?.notes||""} placeholder="Client requirements, preferences and account notes"/></label>
      </div>
      <button className="primary-action" disabled={saving}>{saving?<Loader2 className="spin" size={15}/>:<CheckCircle2 size={15}/>} {saving?"Saving…":editingClient?"Save changes":"Create client"}</button>
    </form>}

    {loading?<div className="task-empty"><Loader2 className="spin" size={20}/> Loading client workspace…</div>:filtered.length===0?<div className="task-empty"><Building2 size={26}/><b>No client accounts found</b><span>Try another search or create a client account.</span></div>:
      <div className="client-list phase2-client-list">{filtered.map(client=>{
        const clientProjects=projects.filter(p=>p.client_id===client.id);
        const isExpanded=expandedClient===client.id;
        return <article className={"client-card phase2-client-card "+(isExpanded?"expanded":"")} key={client.id}>
          <div className="client-card-top">
            <div className="client-logo">{client.name.slice(0,1).toUpperCase()}</div>
            <div className="client-name"><b>{client.name}</b><span>{client.service_package||"Service package not set"}</span></div>
            <span className={client.status==="active"?"staff-status active":"staff-status"}>{client.status}</span>
          </div>
          <div className="client-contact">
            {client.contact_person&&<span><BriefcaseBusiness size={13}/>{client.contact_person}</span>}
            {client.email&&<span><Mail size={13}/>{client.email}</span>}
            {client.phone&&<span><Phone size={13}/>{client.phone}</span>}
          </div>
          <div className="phase2-client-stats"><span><FolderKanban size={14}/>{clientProjects.length} projects</span><span><ListTodo size={14}/>{tasks.filter(t=>clientProjects.some(p=>p.id===t.project_id)).length} linked tasks</span></div>
          <div className="client-card-actions phase2-client-actions">
            <button type="button" className="secondary-action" onClick={()=>setExpandedClient(isExpanded?null:client.id)}>{isExpanded?"Hide details":"View client workspace"} {isExpanded?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>
            {editable&&<button type="button" className="secondary-action" onClick={()=>startEditClient(client)}><Pencil size={14}/> Edit</button>}
          </div>
          {isExpanded&&<div className="phase2-client-detail">
            {client.notes&&<div className="crm-account-notes"><b>Account notes</b><p>{client.notes}</p></div>}
            {editable&&<div className="crm-inline-status"><label>Account status<select value={client.status} onChange={e=>void updateClientStatus(client,e.target.value)}><option value="active">Active</option><option value="paused">Paused</option><option value="inactive">Inactive</option></select></label><button className="primary-action" onClick={()=>startProject(client.id)} type="button"><Plus size={14}/> Add project</button></div>}
            <div className="phase2-project-heading"><div><h3>Projects & delivery</h3><p>Project deadlines, task progress and assigned team</p></div><span>{clientProjects.length} total</span></div>
            {projectFor===client.id&&<form className="task-form project-editor" onSubmit={e=>void saveProject(e,client.id)}>
              <div className="task-form-heading"><b>{editingProject?"Edit project":"New project"}</b><button type="button" onClick={()=>{setProjectFor(null);setEditingProject(null);}}><X size={14}/> Close</button></div>
              <div className="task-form-grid">
                <label>Project name<input name="name" required defaultValue={editingProject?.name||""} placeholder="e.g. Website redesign"/></label>
                <label>Status<select name="status" defaultValue={editingProject?.status||"active"}>{projectStatuses.map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}{editingProject&&!projectStatuses.includes(editingProject.status)&&<option value={editingProject.status}>{editingProject.status}</option>}</select></label>
                <label>Start date<input name="start_date" type="date" defaultValue={editingProject?.start_date||""}/></label>
                <label>Due date<input name="due_date" type="date" defaultValue={editingProject?.due_date||""}/></label>
                <label className="crm-notes-field">Description<textarea name="description" rows={2} defaultValue={editingProject?.description||""} placeholder="Scope, deliverables and project brief"/></label>
              </div>
              <button className="primary-action" disabled={saving}>{saving?<Loader2 className="spin" size={14}/>:<CheckCircle2 size={14}/>} {saving?"Saving…":editingProject?"Save project":"Create project"}</button>
            </form>}
            {clientProjects.length===0?<div className="task-empty compact-empty">No projects linked to this client yet.</div>:
              <div className="phase2-project-list">{clientProjects.map(project=>{
                const stats=taskStats(project.id);const percent=stats.total?Math.round(stats.done/stats.total*100):0;
                const overdue=Boolean(project.due_date&&project.due_date<new Date().toISOString().slice(0,10)&&!["completed","cancelled"].includes(project.status));
                return <article className="phase2-project-card" key={project.id}>
                  <div className="phase2-project-top"><div><b>{project.name}</b><small>{project.description||"No project description"}</small></div><span className={"project-status "+(project.status==="completed"?"complete":overdue?"overdue":"")}>{overdue?<AlertTriangle size={12}/>:project.status==="completed"?<CheckCircle2 size={12}/>:<CircleDot size={12}/>} {project.status.replaceAll("_"," ")}</span></div>
                  <div className="phase2-project-meta"><span><CalendarClock size={13}/> {dateLabel(project.start_date)} – {dateLabel(project.due_date)}</span><span><ListTodo size={13}/> {stats.done}/{stats.total} tasks complete</span></div>
                  <div className="phase2-project-progress"><i style={{width:percent+"%"}}/></div>
                  <div className="phase2-project-footer"><span><Users size={13}/> {stats.people.length?stats.people.map(personName).join(", "):"No team assigned yet"}</span>{editable&&<div className="phase2-project-actions"><select aria-label={"Project status for "+project.name} value={project.status} onChange={e=>void updateProjectStatus(project,e.target.value)}>{projectStatuses.map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}{!projectStatuses.includes(project.status)&&<option value={project.status}>{project.status}</option>}</select><button type="button" className="secondary-action" onClick={()=>startProject(client.id,project)}><Pencil size={13}/> Edit</button></div>}</div>
                </article>;
              })}</div>}
            <div className="crm-created-date">Client since {dateLabel(client.created_at.slice(0,10))}</div>
          </div>}
        </article>;
      })}</div>}
    <p className="staff-footnote">Project progress is calculated from tasks linked to each project. Team members shown are derived from those assigned tasks. Client and project records use the existing SDMA database fields.</p>
  </section>;
}
