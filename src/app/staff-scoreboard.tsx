"use client";
import { useEffect,useMemo,useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trophy,RefreshCw,Medal } from "lucide-react";
type ScoreRow={user_id:string;full_name:string;role:string;score:number;completed_tasks:number;assigned_tasks:number;on_time_tasks:number;attendance_days:number;report_days:number;rank:number};
export default function StaffScoreboard({userId}:{userId:string;role?:string}){
 const db=useMemo(()=>createClient(),[]); const [rows,setRows]=useState<ScoreRow[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
 async function load(){setLoading(true);setError("");const {data,error}=await (db as any).rpc("get_staff_scoreboard");if(error)setError(error.message);else setRows((data||[]) as ScoreRow[]);setLoading(false);}
 useEffect(()=>{void load();},[]);
 const mine=rows.find(r=>r.user_id===userId);
 const canSeeTeam = true;
 const visibleRows = rows;
 return <section className="panel staff-scoreboard"><div className="panel-head"><div><h3><Trophy size={17}/> Staff scoreboard</h3><p>{canSeeTeam?"CEO team overview · monthly performance":"Your monthly performance"}</p></div><button className="secondary-action" onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button></div>
 {error&&<p className="task-alert error">{error}</p>}
 {mine&&<div className="my-score"><span>Your current position</span><b>{canSeeTeam?"#"+mine.rank+" · ":""}{mine.score}/100</b><small>{mine.completed_tasks}/{mine.assigned_tasks} tasks completed</small></div>}
 {loading?<p className="content-footnote">Loading performance score…</p>:visibleRows.length===0?<p className="content-footnote">No score data available yet.</p>:<div className="score-list">{visibleRows.map(r=><article key={r.user_id} className={r.user_id===userId?"score-row mine":"score-row"}>{canSeeTeam&&<span className="score-rank">{r.rank<=3?<Medal size={17}/>:("#"+r.rank)}</span>}<div className="score-person"><b>{r.full_name}</b><small>{r.role.replaceAll("_"," ")} · {r.completed_tasks}/{r.assigned_tasks} tasks · {r.attendance_days} attendance days</small></div><strong>{r.score}<small>/100</small></strong></article>)}</div>}
 <p className="content-footnote">Score: task completion 50%, on-time completion 20%, attendance 20%, daily reports 10%. Current month-to-date. Individual staff can view only their own score; CEO can view the full team.</p>
 </section>;
}
