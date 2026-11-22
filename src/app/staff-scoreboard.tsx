"use client";
import { useEffect,useMemo,useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trophy,RefreshCw,Medal } from "lucide-react";
type ScoreRow={user_id:string;full_name:string;role:string;score:number;completed_tasks:number;assigned_tasks:number;on_time_tasks:number;attendance_days:number;report_days:number;rank:number};
export default function StaffScoreboard({userId}:{userId:string;role?:string}){
 const db=useMemo(()=>createClient(),[]);
 const [rows,setRows]=useState<ScoreRow[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 async function load(){
  setLoading(true);setError("");
  const {data,error}=await (db as any).rpc("get_staff_scoreboard");
  if(error)setError(error.message);
  else setRows(((data||[]) as ScoreRow[]).slice().sort((a,b)=>(a.rank-b.rank)||(b.score-a.score)||a.full_name.localeCompare(b.full_name)));
  setLoading(false);
 }
 useEffect(()=>{void load();},[]);
 const mine=rows.find(r=>r.user_id===userId);
 return <section className="panel staff-scoreboard">
  <div className="panel-head">
   <div><h3><Trophy size={17}/> Staff scoreboard</h3><p>Full team monthly performance · Month to date</p></div>
   <button className="secondary-action" onClick={()=>void load()} disabled={loading}><RefreshCw size={14} className={loading?"spin":""}/> {loading?"Updating":"Refresh"}</button>
  </div>
  {mine&&<div className="my-score"><span>Your current position</span><b>#{mine.rank} · {mine.score}/100</b><small>{mine.completed_tasks}/{mine.assigned_tasks} tasks completed</small></div>}
  {error&&<p className="task-alert error" role="alert">Could not load the team scoreboard: {error}</p>}
  {loading?<p className="content-footnote" aria-live="polite">Loading team performance…</p>:rows.length===0?<p className="content-footnote">No score data available yet.</p>:<div className="score-list">{rows.map(r=><article key={r.user_id} className={r.user_id===userId?"score-row mine":"score-row"}>
   <span className={"score-rank "+(r.rank<=3?"top-rank":"")}>{r.rank<=3?<Medal size={17}/>:("#"+r.rank)}</span>
   <div className="score-person"><b>{r.full_name}{r.user_id===userId?" · You":""}</b><small>{r.role.replaceAll("_"," ")} · {r.completed_tasks}/{r.assigned_tasks} tasks · {r.attendance_days} attendance days</small><span className="score-progress"><i style={{width:Math.max(0,Math.min(100,Number(r.score)||0))+"%"}}/></span></div>
   <strong>{r.score}<small>/100</small></strong>
  </article>)}</div>}
  <p className="content-footnote">Score weights: task completion 50%, on-time completion 20%, attendance 20%, daily reports 10%. Rankings are visible to all staff.</p>
 </section>;
}
