"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, CheckCheck, Loader2, Megaphone, Plus, RefreshCw, Send } from "lucide-react";

type Announcement={id:string;title:string;body:string;priority:string;is_active:boolean;expires_at:string|null;created_by:string;created_at:string;target_roles:string[]|null};
type Notification={id:string;user_id:string;title:string;body:string|null;notification_type:string;action_url:string|null;read_at:string|null;created_at:string;reminder_id:string|null;reminder_date:string|null};
type Reminder={id:string;title:string;body:string|null;reminder_time:string;days_of_week:number[];is_active:boolean;created_by:string;created_at:string};
const managerRoles=["ceo","operations_manager","team_lead","office_admin"];
const roleOptions=[["ceo","CEO"],["operations_manager","Operations Manager"],["team_lead","Team Leader"],["office_admin","Office Admin"],["marketer","Marketer"],["designer","Designer"],["accounts","Accounts"],["staff","Staff"]];
const days=[["Mon",1],["Tue",2],["Wed",3],["Thu",4],["Fri",5],["Sat",6],["Sun",0]] as const;
const dateLabel=(v:string)=>new Date(v).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
export default function AnnouncementsPanel({role,userId,defaultTab="announcements"}:{role:string;userId:string;defaultTab?:"announcements"|"notifications"}){
 const supabase=useMemo(()=>createClient(),[]),isManager=managerRoles.includes(role);
 const [tab,setTab]=useState<"announcements"|"notifications"|"reminders">(defaultTab);
 const [announcements,setAnnouncements]=useState<Announcement[]>([]),[notifications,setNotifications]=useState<Notification[]>([]),[reminders,setReminders]=useState<Reminder[]>([]);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [showForm,setShowForm]=useState(false),[showReminderForm,setShowReminderForm]=useState(false);
 const [title,setTitle]=useState(""),[body,setBody]=useState(""),[priority,setPriority]=useState("normal"),[targetRoles,setTargetRoles]=useState<string[]>([]);
 const [reminderTitle,setReminderTitle]=useState("Daily Ads Report"),[reminderBody,setReminderBody]=useState("Share the daily client Meta Ads performance report."),[reminderTime,setReminderTime]=useState("10:30"),[reminderDays,setReminderDays]=useState<number[]>([1,2,3,4,5]);
 const unread=notifications.filter(n=>!n.read_at).length;
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  const [a,n,r]=await Promise.all([
   supabase.from("announcements").select("*").order("created_at",{ascending:false}).limit(100),
   supabase.from("notifications").select("*").order("created_at",{ascending:false}).limit(100),
   supabase.from("office_reminders").select("*").order("reminder_time")
  ]);
  if(a.error)setError(a.error.message);else setAnnouncements((a.data||[]) as Announcement[]);
  if(n.error)setError(n.error.message);else setNotifications((n.data||[]) as Notification[]);
  if(r.error)setError(r.error.message);else setReminders((r.data||[]) as Reminder[]);
  setLoading(false);
 },[supabase]);
 useEffect(()=>{let mounted=true;(async()=>{if(mounted){await supabase.rpc("deliver_due_office_reminders");await load()}})();return()=>{mounted=false}},[supabase,load]);
 async function createAnnouncement(ev:FormEvent){
  ev.preventDefault();setSaving(true);setError("");setSuccess("");
  const {data,error:e}=await supabase.from("announcements").insert({title,body,priority,is_active:true,created_by:userId,target_roles:targetRoles.length?targetRoles:null}).select("*").single();
  if(e){setError(e.message);setSaving(false);return}
  const audience=targetRoles.length?targetRoles:null;
  let query=supabase.from("profiles").select("id").eq("is_active",true);
  if(audience){query=query.in("role",audience as never)}
  const {data:users,error:pe}=await query;
  if(pe)setError("Announcement published, but notifications could not be sent: "+pe.message);
  else if(users?.length){
   const rows=users.map(u=>({user_id:u.id,title:"New announcement: "+title,body,notification_type:"announcement",action_url:null}));
   const {error:ne}=await supabase.from("notifications").insert(rows);
   if(ne)setError("Announcement published, but notifications could not be sent: "+ne.message);
  }
  if(!e){setSuccess("Announcement published to "+(targetRoles.length?targetRoles.join(", "):"all active staff")+".");setTitle("");setBody("");setPriority("normal");setTargetRoles([]);setShowForm(false);await load()}
  setSaving(false);
 }
 async function createReminder(ev:FormEvent){
  ev.preventDefault();if(!reminderDays.length){setError("Choose at least one weekday.");return}
  setSaving(true);setError("");setSuccess("");
  const {error:e}=await supabase.from("office_reminders").insert({title:reminderTitle,body:reminderBody||null,reminder_time:reminderTime+":00",days_of_week:reminderDays,is_active:true,created_by:userId});
  if(e)setError(e.message);else{setSuccess("Recurring reminder saved. It will create an in-app notification when a staff member opens the workspace after the scheduled time.");setShowReminderForm(false);await load()}
  setSaving(false);
 }
 async function markRead(item:Notification){
  const {error:e}=await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("id",item.id);
  if(e)setError(e.message);else setNotifications(prev=>prev.map(n=>n.id===item.id?{...n,read_at:new Date().toISOString()}:n));
 }
 async function markAllRead(){
  const {error:e}=await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("user_id",userId).is("read_at",null);
  if(e)setError(e.message);else{setNotifications(prev=>prev.map(n=>({...n,read_at:n.read_at||new Date().toISOString()})));setSuccess("All notifications marked as read.")}
 }
 async function toggleReminder(item:Reminder){
  const {error:e}=await supabase.from("office_reminders").update({is_active:!item.is_active}).eq("id",item.id);
  if(e)setError(e.message);else await load();
 }
 const toggleRole=(v:string)=>setTargetRoles(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v]);
 const toggleDay=(v:number)=>setReminderDays(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v]);
 return <div className="announce-workspace">
  <div className="announce-summary"><article><span>Announcements</span><b>{announcements.length}</b></article><article><span>Unread notifications</span><b>{unread}</b></article><article><span>Active reminders</span><b>{reminders.filter(r=>r.is_active).length}</b></article></div>
  <div className="announce-toolbar"><div className="announce-tabs"><button className={tab==="announcements"?"active":""} onClick={()=>setTab("announcements")}><Megaphone size={15}/> Announcements</button><button className={tab==="notifications"?"active":""} onClick={()=>setTab("notifications")}><Bell size={15}/> Notifications {unread>0&&<i>{unread}</i>}</button>{isManager&&<button className={tab==="reminders"?"active":""} onClick={()=>setTab("reminders")}><RefreshCw size={15}/> Reminders</button>}</div>
   {isManager&&<button className="primary-action" onClick={()=>tab==="reminders"?setShowReminderForm(!showReminderForm):setShowForm(!showForm)}><Plus size={15}/>{tab==="reminders"?"Add reminder":"New announcement"}</button>}
  </div>
  {error&&<div className="finance-alert error">{error}</div>}{success&&<div className="finance-alert success">{success}</div>}
  {showForm&&isManager&&<form className="task-form" onSubmit={createAnnouncement}><div className="task-form-heading"><b>Publish announcement</b><button type="button" onClick={()=>setShowForm(false)}>Close</button></div>
   <div className="task-form-grid"><label>Title<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Office update"/></label><label>Priority<select value={priority} onChange={e=>setPriority(e.target.value)}><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></label><label className="full-width">Message<textarea required rows={4} value={body} onChange={e=>setBody(e.target.value)} placeholder="Write the announcement…"/></label></div>
   <div className="announce-audience"><b>Audience</b><small>Leave all roles unselected to send to everyone.</small><div>{roleOptions.map(([v,l])=><label key={v}><input type="checkbox" checked={targetRoles.includes(v)} onChange={()=>toggleRole(v)}/>{l}</label>)}</div></div>
   <button className="primary-action" disabled={saving||!title.trim()||!body.trim()}>{saving?<Loader2 className="spin" size={15}/>:<Send size={15}/>}Publish & notify</button>
  </form>}
  {showReminderForm&&isManager&&<form className="task-form" onSubmit={createReminder}><div className="task-form-heading"><b>Create recurring reminder</b><button type="button" onClick={()=>setShowReminderForm(false)}>Close</button></div>
   <div className="task-form-grid"><label>Reminder title<input required value={reminderTitle} onChange={e=>setReminderTitle(e.target.value)}/></label><label>Time (India)<input required type="time" value={reminderTime} onChange={e=>setReminderTime(e.target.value)}/></label><label className="full-width">Message<input value={reminderBody} onChange={e=>setReminderBody(e.target.value)}/></label></div>
   <div className="announce-audience"><b>Repeat on</b><div>{days.map(([label,value])=><label key={value}><input type="checkbox" checked={reminderDays.includes(value)} onChange={()=>toggleDay(value)}/>{label}</label>)}</div></div>
   <p className="content-footnote">Reminders are generated in-app when each staff member opens the workspace after the scheduled time. They are not push notifications and do not run while the app is closed.</p>
   <button className="primary-action" disabled={saving||!reminderTitle.trim()}>{saving?<Loader2 className="spin" size={15}/>:<CheckCheck size={15}/>}Save reminder</button>
  </form>}
  {loading?<div className="task-empty"><Loader2 className="spin" size={22}/>Loading announcements…</div>:tab==="announcements"?<section className="announce-list"><div className="panel-head"><div><h3>Agency announcements</h3><p>Updates shared with your team</p></div><button className="secondary-action" onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button></div>
   {!announcements.length?<div className="task-empty"><Megaphone size={25}/><b>No announcements yet</b><span>Important office updates will appear here.</span></div>:announcements.map(a=><article className="announce-card" key={a.id}><div className="announce-card-head"><b>{a.title}</b><span className={"announce-priority "+a.priority}>{a.priority}</span></div><p>{a.body}</p><small>{dateLabel(a.created_at)} · {a.target_roles?.length?a.target_roles.join(", "):"All staff"}</small></article>)}
  </section>:tab==="notifications"?<section className="announce-list"><div className="panel-head"><div><h3>Your notifications</h3><p>Personal updates and scheduled reminders</p></div>{unread>0&&<button className="secondary-action" onClick={()=>void markAllRead()}><CheckCheck size={14}/> Mark all read</button>}</div>
   {!notifications.length?<div className="task-empty"><Bell size={25}/><b>You're all caught up</b><span>New updates will appear here.</span></div>:notifications.map(n=><article className={n.read_at?"notification-card read":"notification-card unread"} key={n.id}><div><b>{n.title}</b><p>{n.body}</p><small>{dateLabel(n.created_at)} · {n.notification_type.replaceAll("_"," ")}</small></div>{!n.read_at&&<button className="secondary-action" onClick={()=>void markRead(n)}>Mark read</button>}</article>)}
  </section>:<section className="announce-list"><div className="panel-head"><div><h3>Recurring office reminders</h3><p>Scheduled in India time (Asia/Kolkata)</p></div><button className="secondary-action" onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button></div>
   {!reminders.length?<div className="task-empty"><RefreshCw size={25}/><b>No reminders configured</b><span>Add the daily ads report and evening report reminders.</span></div>:reminders.map(r=><article className="reminder-card" key={r.id}><div><b>{r.title}</b><p>{r.body}</p><small>{r.reminder_time.slice(0,5)} · {days.filter(d=>r.days_of_week.includes(d[1])).map(d=>d[0]).join(", ")}</small></div><button className="secondary-action" onClick={()=>void toggleReminder(r)}>{r.is_active?"Pause":"Activate"}</button></article>)}
  </section>}
 </div>;
}
