"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {RefreshCw,Users,Clock3,ClipboardCheck,Star} from "lucide-react";
type Row=Record<string,any>;
export default function HrReportsPanel({role,userId}:{role:string;userId:string}){
 const db=useMemo(()=>createClient(),[]);const [staff,setStaff]=useState<Row[]>([]),[sessions,setSessions]=useState<Row[]>([]),[reports,setReports]=useState<Row[]>([]),[tasks,setTasks]=useState<Row[]>([]),[reviews,setReviews]=useState<Row[]>([]),[loading,setLoading]=useState(true),[month,setMonth]=useState(new Date().toISOString().slice(0,7)+"-01"),[error,setError]=useState("");
 const manager=["ceo","operations_manager"].includes(role);
 const load=useCallback(async()=>{if(!manager){setError("HR reports are restricted to CEO and Operations Manager.");setLoading(false);return;}setLoading(true);setError("");const end=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)).toISOString().slice(0,10);
 const [p,a,d,t,r]=await Promise.all([(db as any).from("profiles").select("id,full_name,role,is_active").eq("is_active",true).order("full_name"),(db as any).from("attendance_sessions").select("user_id,attendance_date,check_in,check_out").gte("attendance_date",month).lt("attendance_date",end),(db as any).from("daily_reports").select("user_id,report_type,report_date,completed_tasks,planned_tasks,blockers").gte("report_date",month).lt("report_date",end),(db as any).from("tasks").select("assigned_to,status,due_date").gte("created_at",month).lt("created_at",end),(db as any).from("staff_performance_reviews").select("*").eq("review_month",month)]);
 for(const x of [p,a,d,t,r])if(x.error)setError(x.error.message);setStaff(p.data||[]);setSessions(a.data||[]);setReports(d.data||[]);setTasks(t.data||[]);setReviews(r.data||[]);setLoading(false);
 },[db,month,manager]);useEffect(()=>{void load()},[load]);
 const hours=(id:string)=>sessions.filter(x=>x.user_id===id&&x.check_out).reduce((s,x)=>s+Math.max(0,(new Date(x.check_out).getTime()-new Date(x.check_in).getTime())/3600000),0);
 const staffName=(id:string)=>staff.find(x=>x.id===id)?.full_name||"Team member";
 return <section className="hr-workspace"><div className="tasks-toolbar"><div><h2>HR & Staff Reports</h2><p>Monthly attendance, working hours, daily activity and performance reviews.</p></div><button className="secondary-action" onClick={()=>void load()}><RefreshCw size={15}/> Refresh</button></div>
 <div className="hr-filter"><label>Report month<input type="month" value={month.slice(0,7)} onChange={e=>setMonth(e.target.value+"-01")}/></label><span>{sessions.length} attendance sessions · {reports.length} daily reports · {tasks.length} tasks created</span></div>
 {error&&<p className="task-alert error">{error}</p>}
 {loading?<div className="task-empty">Loading HR reports…</div>:<div className="academy-table-wrap"><table className="academy-table"><thead><tr><th>Staff member</th><th>Attendance days</th><th>Working hours</th><th>Daily reports</th><th>Tasks</th><th>Performance</th></tr></thead><tbody>{staff.map(p=>{const ss=sessions.filter(x=>x.user_id===p.id),days=new Set(ss.map(x=>x.attendance_date)).size,hrs=hours(p.id),dr=reports.filter(x=>x.user_id===p.id).length,ts=tasks.filter(x=>x.assigned_to===p.id);const done=ts.filter(x=>x.status==="completed").length;const review=reviews.find(x=>x.staff_id===p.id);return <tr key={p.id}><td><b>{p.full_name}</b><small>{p.role}</small></td><td>{days}</td><td>{hrs.toFixed(1)} h</td><td>{dr}</td><td>{done}/{ts.length} completed</td><td>{review?.rating!=null?<span className="hr-rating"><Star size={13}/>{review.rating}/5</span>:"Not reviewed"}</td></tr>})}</tbody></table></div>}
 <div className="hr-note"><Users size={16}/> Performance review entry and downloadable monthly report will be enabled after the manager review workflow is completed.</div>
 </section>
}
