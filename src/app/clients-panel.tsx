"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, RefreshCw, BriefcaseBusiness, Mail, Phone, FolderKanban, Loader2 } from "lucide-react";

type Client={id:string;name:string;contact_person:string|null;email:string|null;phone:string|null;service_package:string|null;status:string;notes:string|null;created_at:string};
type Project={id:string;client_id:string|null;name:string;description:string|null;status:string;start_date:string|null;due_date:string|null};
const canEdit=(role:string)=>["ceo","operations_manager","team_lead","office_admin","accounts"].includes(role);

export default function ClientsPanel({role}:{role:string}) {
  const supabase=useMemo(()=>createClient(),[]);
  const [clients,setClients]=useState<Client[]>([]);
  const [projects,setProjects]=useState<Project[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [showClient,setShowClient]=useState(false);
  const [projectFor,setProjectFor]=useState<string|null>(null);
  const [search,setSearch]=useState("");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const editable=canEdit(role);

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    const [c,p]=await Promise.all([
      supabase.from("clients").select("*").order("created_at",{ascending:false}),
      supabase.from("projects").select("*").order("created_at",{ascending:false})
    ]);
    if(c.error)setError(c.error.message);else setClients((c.data??[]) as Client[]);
    if(p.error)setError(p.error.message);else setProjects((p.data??[]) as Project[]);
    setLoading(false);
  },[supabase]);
  useEffect(()=>{void load();},[load]);

  async function createClientRecord(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const formElement=event.currentTarget;setSaving(true);setError("");setNotice("");
    const form=new FormData(formElement);
    const payload={name:String(form.get("name")||"").trim(),contact_person:String(form.get("contact_person")||"").trim()||null,email:String(form.get("email")||"").trim()||null,phone:String(form.get("phone")||"").trim()||null,service_package:String(form.get("service_package")||"").trim()||null,notes:String(form.get("notes")||"").trim()||null,status:"active"};
    const {error}=await supabase.from("clients").insert(payload);
    if(error)setError(error.message);else{setNotice("Client added.");formElement.reset();setShowClient(false);await load();}
    setSaving(false);
  }

  async function createProject(event:FormEvent<HTMLFormElement>,clientId:string) {
    event.preventDefault();setSaving(true);setError("");setNotice("");
    const form=new FormData(event.currentTarget);
    const payload={client_id:clientId,name:String(form.get("name")||"").trim(),description:String(form.get("description")||"").trim()||null,start_date:String(form.get("start_date")||"")||null,due_date:String(form.get("due_date")||"")||null,status:"active"};
    const {error}=await supabase.from("projects").insert(payload);
    if(error)setError(error.message);else{setNotice("Project created.");setProjectFor(null);await load();}
    setSaving(false);
  }

  async function updateClientStatus(client:Client,status:string) {
    const {error}=await supabase.from("clients").update({status}).eq("id",client.id);
    if(error)setError(error.message);else{setNotice("Client status updated.");await load();}
  }

  const filtered=clients.filter(c=>[c.name,c.contact_person,c.email,c.phone,c.service_package].some(v=>(v||"").toLowerCase().includes(search.toLowerCase())));
  return <section className="clients-workspace">
    <div className="tasks-toolbar"><div><h2>Clients & CRM</h2><p>Manage agency accounts, service packages and client projects.</p></div><div className="tasks-actions"><button className="secondary-action" onClick={()=>void load()}><RefreshCw size={15}/> Refresh</button>{editable&&<button className="primary-action" onClick={()=>setShowClient(v=>!v)}><Plus size={15}/> Add client</button>}</div></div>
    <div className="client-summary"><div><span>Active clients</span><b>{clients.filter(c=>c.status==="active").length}</b></div><div><span>Total projects</span><b>{projects.length}</b></div><div><span>Paused / inactive</span><b>{clients.filter(c=>c.status!=="active").length}</b></div></div>
    <input className="staff-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients, contact or service…"/>
    {error&&<p className="task-alert error">{error}</p>}{notice&&<p className="task-alert success">{notice}</p>}
    {showClient&&editable&&<form className="task-form" onSubmit={createClientRecord}>
      <div className="task-form-heading"><b>New client account</b><button type="button" onClick={()=>setShowClient(false)}>Close</button></div>
      <div className="task-form-grid"><label>Client / Brand name<input name="name" required placeholder="Company name"/></label><label>Contact person<input name="contact_person" placeholder="Primary contact"/></label><label>Email<input name="email" type="email" placeholder="client@example.com"/></label><label>Phone<input name="phone" placeholder="+91…"/></label><label>Service package<input name="service_package" placeholder="Performance marketing, SEO…"/></label><label>Notes<input name="notes" placeholder="Internal notes"/></label></div>
      <button className="primary-action" disabled={saving}>{saving?<Loader2 className="spin" size={15}/>:<Plus size={15}/>} Save client</button>
    </form>}
    {loading?<div className="task-empty"><Loader2 className="spin" size={20}/> Loading clients…</div>:filtered.length===0?<div className="task-empty">No client accounts found. Add your first client to begin.</div>:
      <div className="client-list">{filtered.map(client=>{
        const clientProjects=projects.filter(p=>p.client_id===client.id);
        return <article className="client-card" key={client.id}>
          <div className="client-card-top"><div className="client-logo">{client.name.slice(0,1).toUpperCase()}</div><div className="client-name"><b>{client.name}</b><span>{client.service_package||"Service package not set"}</span></div><span className={client.status==="active"?"staff-status active":"staff-status"}>{client.status}</span></div>
          <div className="client-contact">{client.contact_person&&<span><BriefcaseBusiness size={13}/>{client.contact_person}</span>}{client.email&&<span><Mail size={13}/>{client.email}</span>}{client.phone&&<span><Phone size={13}/>{client.phone}</span>}</div>
          <div className="client-project-head"><b><FolderKanban size={14}/> Projects ({clientProjects.length})</b>{editable&&<button onClick={()=>setProjectFor(projectFor===client.id?null:client.id)} type="button"><Plus size={13}/> Add project</button>}</div>
          {projectFor===client.id&&<form className="project-inline" onSubmit={e=>void createProject(e,client.id)}><input name="name" required placeholder="Project name"/><input name="description" placeholder="Description"/><input name="start_date" type="date" aria-label="Start date"/><input name="due_date" type="date" aria-label="Due date"/><button className="primary-action" disabled={saving}>Save project</button></form>}
          {clientProjects.length>0&&<div className="project-tags">{clientProjects.map(p=><span key={p.id}>{p.name}<small>{p.status}</small></span>)}</div>}
          {editable&&<div className="client-card-actions"><label>Account status<select value={client.status} onChange={e=>void updateClientStatus(client,e.target.value)}><option value="active">Active</option><option value="paused">Paused</option><option value="inactive">Inactive</option></select></label></div>}
        </article>;
      })}</div>}
  </section>;
}
