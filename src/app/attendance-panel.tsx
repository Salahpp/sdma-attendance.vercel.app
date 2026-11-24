"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Camera, MapPin, Clock3, LogIn, LogOut, Loader2, RefreshCw, ShieldCheck, Users } from "lucide-react";

type TeamMember = {id:string;full_name:string;role:string;is_active:boolean};
type AttendanceRow = {
  id:string; user_id:string; attendance_date:string; check_in:string|null; check_out:string|null;
  check_in_lat:number|null; check_in_lng:number|null; check_out_lat:number|null; check_out_lng:number|null;
  check_in_selfie_path:string|null; check_out_selfie_path:string|null; check_in_location_type:string|null; check_out_location_type:string|null; status:string; break_minutes:number;
};
function officeDate() {
  const parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const part = (type:string) => parts.find(p => p.type === type)?.value || "";
  return part("year")+"-"+part("month")+"-"+part("day");
}
function timeLabel(value:string|null) {
  return value ? new Date(value).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"}) : "—";
}
function timeInput(value:string|null) {
  return value ? new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(value)) : "";
}

export default function AttendancePanel({userId,role}:{userId:string;role:string}) {
  const supabase = useMemo(()=>createClient(),[]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const [record,setRecord] = useState<AttendanceRow|null>(null);
  const [teamRows,setTeamRows] = useState<AttendanceRow[]>([]);
  const [teamMembers,setTeamMembers] = useState<TeamMember[]>([]);
  const [month,setMonth] = useState(officeDate().slice(0,7));
  const [monthRows,setMonthRows] = useState<AttendanceRow[]>([]);
  const [correctingId,setCorrectingId] = useState<string|null>(null);
  const canMonitorTeam=["ceo","operations_manager","team_lead","office_admin"].includes(role);
  const [loading,setLoading] = useState(true);
  const [cameraReady,setCameraReady] = useState(false);
  const [photo,setPhoto] = useState<Blob|null>(null);
  const [photoUrl,setPhotoUrl] = useState("");
  const [note,setNote] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [liveNow,setLiveNow] = useState(Date.now());
  const [selfieUrls,setSelfieUrls] = useState<Record<string,{checkIn?:string;checkOut?:string}>>({});

  const load = useCallback(async()=>{
    setLoading(true); setError("");
    const monthStart = month + "-01";
    const [year, monthNumber] = month.split("-").map(Number);
    const monthEnd = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0,10);
    let monthlyQuery = supabase.from("attendance").select("*").gte("attendance_date",monthStart).lt("attendance_date",monthEnd).order("attendance_date",{ascending:false});
    if(!canMonitorTeam) monthlyQuery = monthlyQuery.eq("user_id",userId);
    const [todayResult,monthResult] = await Promise.all([
      supabase.from("attendance").select("*").eq("user_id",userId).eq("attendance_date",officeDate()).maybeSingle(),
      monthlyQuery
    ]);
    if(todayResult.error) setError(todayResult.error.message); else setRecord(todayResult.data as AttendanceRow|null);
    if(monthResult.error) setError(monthResult.error.message); else setMonthRows((monthResult.data??[]) as AttendanceRow[]);
    if(canMonitorTeam){
      const [attendanceResult,peopleResult]=await Promise.all([
        supabase.from("attendance").select("*").eq("attendance_date",officeDate()).order("check_in",{ascending:true}),
        supabase.from("profiles").select("id,full_name,role,is_active").eq("is_active",true).order("full_name")
      ]);
      if(attendanceResult.error)setError(attendanceResult.error.message);else {
        const rows=(attendanceResult.data??[]) as AttendanceRow[]; setTeamRows(rows);
        const signed=await Promise.all(rows.map(async row=>{const [ci,co]=await Promise.all([row.check_in_selfie_path?supabase.storage.from("attendance-selfies").createSignedUrl(row.check_in_selfie_path,3600):Promise.resolve({data:null}),row.check_out_selfie_path?supabase.storage.from("attendance-selfies").createSignedUrl(row.check_out_selfie_path,3600):Promise.resolve({data:null})]);return [row.id,{checkIn:ci.data?.signedUrl,checkOut:co.data?.signedUrl}] as const;}));
        setSelfieUrls(Object.fromEntries(signed));
      }
      if(peopleResult.error)setError(peopleResult.error.message);else setTeamMembers((peopleResult.data??[]) as TeamMember[]);
    }
    setLoading(false);
  },[supabase,userId,canMonitorTeam,month]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{const timer=window.setInterval(()=>setLiveNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
  useEffect(()=>()=>{if(streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop());},[]);
  useEffect(()=>{return ()=>{if(photoUrl) URL.revokeObjectURL(photoUrl);};},[photoUrl]);

  async function startCamera() {
    setError(""); setMessage("");
    try {
      if(!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access requires HTTPS and a supported browser.");
      if(streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop());
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:"user",width:{ideal:900},height:{ideal:1200}}});
      streamRef.current=stream;
      if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play();}
      setCameraReady(true);
    } catch(e) {setError(e instanceof Error?e.message:"Could not open camera.");}
  }

  function capturePhoto() {
    const video=videoRef.current;
    if(!video || !video.videoWidth){setError("Start the camera and wait for the preview before taking a selfie.");return;}
    const canvas=document.createElement("canvas");
    const width=Math.min(video.videoWidth,900); const height=Math.round(width*video.videoHeight/video.videoWidth);
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext("2d");
    if(!ctx){setError("Unable to capture selfie.");return;}
    ctx.translate(width,0);ctx.scale(-1,1);ctx.drawImage(video,0,0,width,height);
    canvas.toBlob(blob=>{
      if(!blob){setError("Could not process selfie.");return;}
      setPhoto(blob);setPhotoUrl(URL.createObjectURL(blob));setMessage("Selfie captured. You can now punch attendance.");
      if(streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop());
      streamRef.current=null;setCameraReady(false);
    },"image/jpeg",0.82);
  }

  async function punch() {
    if(!photo){setError("Please capture a fresh selfie first.");return;}
    if(busy)return;
    setBusy(true);setError("");setMessage("");
    let stage="GPS location";
    let uploadedPath:string|null=null;
    try {
      const getPosition=(highAccuracy:boolean,timeout:number)=>new Promise<GeolocationPosition>((resolve,reject)=>{
        if(!navigator.geolocation){reject(new Error("Location access is not supported. Enable Location Services for Safari."));return;}
        navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:highAccuracy,timeout,maximumAge:0});
      });
      let position:GeolocationPosition;
      try {
        position=await getPosition(true,20000);
      } catch(firstError) {
        const geoError=firstError as GeolocationPositionError;
        if(geoError?.code===1) throw new Error("Location permission denied. iPhone Settings → Privacy & Security → Location Services → Safari Websites → While Using the App, and enable Precise Location.");
        if(geoError?.code===2 || geoError?.code===3) {
          setMessage("Precise GPS is taking longer. Trying standard GPS…");
          try { position=await getPosition(false,15000); }
          catch(secondError) {
            const fallback=secondError as GeolocationPositionError;
            if(fallback?.code===1) throw new Error("Location permission denied. Allow location access for this website in Safari settings.");
            if(fallback?.code===3) throw new Error("Could not get GPS location in time. Move near a window or outdoors, enable Precise Location, then retry.");
            throw new Error("Your iPhone could not determine its location. Check Location Services and try again.");
          }
        } else throw firstError;
      }
      if(!Number.isFinite(position.coords.latitude)||!Number.isFinite(position.coords.longitude)) throw new Error("GPS returned invalid coordinates. Please retry.");
      const isCheckIn=!record?.check_in;
      const action=isCheckIn?"check-in":"check-out";
      const path=userId+"/"+officeDate()+"/"+action+"-"+crypto.randomUUID()+".jpg";
      stage="Selfie upload";
      setMessage("GPS verified. Uploading selfie…");
      const {error:uploadError}=await supabase.storage.from("attendance-selfies").upload(path,photo,{contentType:"image/jpeg",upsert:false});
      if(uploadError) throw new Error("Selfie upload failed: "+uploadError.message);
      uploadedPath=path;
      stage="Attendance save";
      setMessage("Selfie uploaded. Saving attendance…");
      const args={p_lat:position.coords.latitude,p_lng:position.coords.longitude,p_selfie_path:path,p_note:note.trim()||null};
      const rpcResult=isCheckIn?await supabase.rpc("attendance_check_in",args):await supabase.rpc("attendance_check_out",args);
      if(rpcResult.error) throw new Error("Attendance database save failed: "+rpcResult.error.message);
      setPhoto(null);setPhotoUrl("");setNote("");
      setMessage(isCheckIn?"Check-in recorded successfully.":"Check-out recorded successfully.");
      uploadedPath=null;
      await load();
    } catch(e) {
      if(uploadedPath) {
        const {error:cleanupError}=await supabase.storage.from("attendance-selfies").remove([uploadedPath]);
        if(cleanupError) console.warn("Could not clean up unused attendance selfie:",cleanupError.message);
      }
      const detail=e instanceof Error?e.message:"Unknown error";
      console.error("SDMA attendance punch failed at "+stage+":",e);
      setError(stage+": "+detail);
    } finally {setBusy(false);}
  }

  async function saveCorrection(event:FormEvent<HTMLFormElement>,row:AttendanceRow) {
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const status=String(form.get("status")||row.status);
    const breakMinutes=Math.max(0,Number(form.get("break_minutes")||0));
    const checkInTime=String(form.get("check_in_time")||"");
    const checkOutTime=String(form.get("check_out_time")||"");
    const reason=String(form.get("correction_reason")||"").trim();
    setCorrectingId(row.id);setError("");setMessage("");
    if(checkInTime&&checkOutTime){
      if(!reason){setError("Please enter a reason for changing attendance time.");setCorrectingId(null);return;}
      const checkIn=new Date(row.attendance_date+"T"+checkInTime+":00+05:30");
      const checkOut=new Date(row.attendance_date+"T"+checkOutTime+":00+05:30");
      if(!Number.isFinite(checkIn.getTime())||!Number.isFinite(checkOut.getTime())||checkOut<=checkIn){setError("Check-out must be later than check-in.");setCorrectingId(null);return;}
      const {error:timeError}=await (supabase as any).rpc("sdma_manual_attendance_correction",{
        p_attendance_id:row.id,p_check_in:checkIn.toISOString(),p_check_out:checkOut.toISOString(),p_reason:reason
      });
      if(timeError){setError(timeError.message);setCorrectingId(null);return;}
    }
    const {error:updateError}=await supabase.from("attendance").update({status,break_minutes:breakMinutes}).eq("id",row.id);
    if(updateError){setError(updateError.message);setCorrectingId(null);return;}
    if(!(checkInTime&&checkOutTime)){
      const {error:auditError}=await supabase.from("audit_logs").insert({actor_id:userId,action:"attendance_corrected",entity_type:"attendance",entity_id:row.id,metadata:{status,break_minutes:breakMinutes}});
      setMessage(auditError?"Attendance updated, but the audit note could not be saved: "+auditError.message:"Attendance record corrected.");
    } else setMessage("Attendance times corrected and audit history saved.");
    setCorrectingId(null);await load();
  }

  const monthMinutes=monthRows.reduce((total,row)=>{
    if(!row.check_in)return total;
    const startAt=new Date(row.check_in).getTime();
    const endAt=row.check_out?new Date(row.check_out).getTime():(row.attendance_date===officeDate()?Date.now():startAt);
    return total+Math.max(0,Math.floor((endAt-startAt)/60000)-Number(row.break_minutes||0));
  },0);
  const monthPresent=monthRows.filter(row=>row.status==="present"||row.status==="late").length;
  const monthLate=monthRows.filter(row=>row.status==="late").length;
  const personName=(id:string)=>teamMembers.find(person=>person.id===id)?.full_name||"Team member";

  const checkedIn=Boolean(record?.check_in);
  const checkedOut=Boolean(record?.check_out);
  const start=record?.check_in?new Date(record.check_in).getTime():0;
  const end=record?.check_out?new Date(record.check_out).getTime():liveNow;
  const hours=checkedIn?Math.max(0,(end-start)/3600000):0;
  const duration=checkedIn?Math.floor(hours)+"h "+Math.floor((hours%1)*60)+"m "+Math.floor((hours*60-Math.floor(hours*60))*60)+"s":"—";

  return <section className="attendance-workspace">
    <div className="tasks-toolbar"><div><h2>Attendance</h2><p>Daily selfie and GPS verified check-in / check-out.</p></div><button className="secondary-action" onClick={()=>void load()}><RefreshCw size={15}/> Refresh</button></div>
    <div className="attendance-date"><div><span>Today · India Standard Time</span><b>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Kolkata"})}</b></div><span className={checkedOut?"attendance-done":checkedIn?"attendance-live":"attendance-pending"}>{checkedOut?"Day completed":checkedIn?"Checked in":"Not checked in"}</span></div>
    <div className="attendance-cards">
      <article><span>Check-in</span><b>{timeLabel(record?.check_in||null)}</b><small>{record?.check_in_lat!=null?<><b>{record.check_in_location_type==="office"?"Work From Office":"Work From Out of Office"}</b> · <a target="_blank" rel="noreferrer" href={"https://maps.google.com/?q="+record.check_in_lat+","+record.check_in_lng}>View check-in location</a></>:"No punch recorded"}</small></article>
      <article><span>Check-out</span><b>{timeLabel(record?.check_out||null)}</b><small>{record?.check_out_lat!=null?<><b>{record.check_out_location_type==="office"?"Work From Office":"Work From Out of Office"}</b> · <a target="_blank" rel="noreferrer" href={"https://maps.google.com/?q="+record.check_out_lat+","+record.check_out_lng}>View check-out location</a></>:"Awaiting check-out"}</small></article>
      <article><span>Working time</span><b>{duration}</b><small>{checkedOut?"Today's recorded duration":checkedIn?"Live duration · refresh to update":"Starts after check-in"}</small></article>
    </div>
    {!checkedOut && <div className="attendance-punch">
      <div className="attendance-camera">
        {photoUrl?<img src={photoUrl} alt="Captured attendance selfie"/>:<video ref={videoRef} muted playsInline autoPlay/>}
        {!cameraReady&&!photoUrl&&<div className="camera-placeholder"><Camera size={28}/><span>Camera preview</span></div>}
      </div>
      <div className="attendance-controls">
        <h3>{checkedIn?"Ready to check out?":"Ready to check in?"}</h3>
        <p>Allow camera and precise location access. A fresh selfie and GPS coordinates are required for each punch.</p>
        <label>Optional note<textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Add a note (optional)"/></label>
        <div className="attendance-buttons">
          {!photo?<><button className="secondary-action" onClick={()=>void startCamera()}><Camera size={15}/> {cameraReady?"Restart camera":"Open camera"}</button><button className="primary-action" onClick={capturePhoto} disabled={!cameraReady}>Capture selfie</button></>:<><button className="secondary-action" onClick={()=>{setPhoto(null);setPhotoUrl("");}}>Retake</button><button className="primary-action" onClick={()=>void punch()} disabled={busy}>{busy?<Loader2 className="spin" size={15}/>:checkedIn?<LogOut size={15}/>:<LogIn size={15}/>} {busy?"Verifying…":checkedIn?"Check out":"Check in"}</button></>}
        </div>
        <div className="attendance-privacy"><ShieldCheck size={14}/> Private selfie storage · Server timestamp · GPS captured at punch time</div>
      </div>
    </div>}
    {loading&&<div className="task-empty"><Loader2 className="spin" size={20}/> Loading attendance…</div>}
    {error&&<p className="task-alert error">{error}</p>}{message&&<p className="task-alert success">{message}</p>}
    {canMonitorTeam&&<section className="team-attendance"><div className="panel-head"><div><h3>Team attendance</h3><p>Today’s check-in status across active staff</p></div><Users size={18}/></div><div className="team-attendance-list">{teamMembers.map(person=>{const row=teamRows.find(r=>r.user_id===person.id);return <article key={person.id}><div className="team-person"><b>{person.full_name||"Staff member"}</b><small>{person.role.replaceAll("_"," ")}</small></div><span className={row?.check_in?(row.check_out?"staff-status active":"attendance-live"):"attendance-pending"}>{row?.check_out?"Completed":row?.check_in?"Working":"Not checked in"}</span><time>In: {timeLabel(row?.check_in||null)} · {row?.check_in?(row.check_in_location_type==="office"?"Work From Office":"Work From Out of Office"):"—"}</time><time>Out: {timeLabel(row?.check_out||null)} · {row?.check_out?(row.check_out_location_type==="office"?"Work From Office":"Work From Out of Office"):"—"}</time><div className="attendance-selfie-pair">{selfieUrls[row?.id||""]?.checkIn&&<a href={selfieUrls[row!.id]?.checkIn} target="_blank" rel="noreferrer"><img src={selfieUrls[row!.id]?.checkIn} alt={person.full_name+" check-in selfie"}/><small>Check-in selfie</small></a>}{selfieUrls[row?.id||""]?.checkOut&&<a href={selfieUrls[row!.id]?.checkOut} target="_blank" rel="noreferrer"><img src={selfieUrls[row!.id]?.checkOut} alt={person.full_name+" check-out selfie"}/><small>Check-out selfie</small></a>}</div>{row?.check_in_lat!=null&&<a className="attendance-location-link" href={"https://maps.google.com/?q="+row.check_in_lat+","+row.check_in_lng} target="_blank" rel="noreferrer">View GPS location</a>}</article>;})}</div></section>}
    <section className="team-reports attendance-monthly">
      <div className="panel-head"><div><h3>Monthly attendance report</h3><p>{canMonitorTeam?"Team attendance and manager corrections":"Your monthly attendance history"}</p></div><label>Month<input type="month" value={month} onChange={e=>{if(e.target.value)setMonth(e.target.value)}}/></label></div>
      <div className="client-summary">
        <div><span>Recorded days</span><b>{monthRows.length}</b></div>
        <div><span>Present / late</span><b>{monthPresent}</b></div>
        <div><span>Late days</span><b>{monthLate}</b></div>
        <div><span>Working hours</span><b>{Math.floor(monthMinutes/60)}h {monthMinutes%60}m</b></div>
      </div>
      {monthRows.length===0?<div className="task-empty">No attendance records for this month.</div>:<div className="team-report-list">{monthRows.map(row=><article key={row.id}>
        <div><b>{canMonitorTeam?personName(row.user_id):row.attendance_date}</b><small>{canMonitorTeam?row.attendance_date:"Attendance record"}</small></div>
        <div><span className={"leave-status "+row.status}>{row.status.replaceAll("_"," ")}</span><small>{timeLabel(row.check_in)} – {timeLabel(row.check_out)} · In: {row.check_in?(row.check_in_location_type==="office"?"Work From Office":"Work From Out of Office"):"—"} · Out: {row.check_out?(row.check_out_location_type==="office"?"Work From Office":"Work From Out of Office"):"—"}</small></div>
        <div><b>{(()=>{if(!row.check_in)return "—";const st=new Date(row.check_in).getTime();const en=row.check_out?new Date(row.check_out).getTime():(row.attendance_date===officeDate()?Date.now():st);const mins=Math.max(0,Math.floor((en-st)/60000)-Number(row.break_minutes||0));return Math.floor(mins/60)+"h "+mins%60+"m";})()}</b><small>Break: {row.break_minutes||0} min</small></div>
        {canMonitorTeam&&<form className="attendance-correction" onSubmit={e=>void saveCorrection(e,row)}>
          <label>Check-in<input name="check_in_time" type="time" defaultValue={timeInput(row.check_in)} required/></label>
          <label>Check-out<input name="check_out_time" type="time" defaultValue={timeInput(row.check_out)} required/></label>
          <label>Correction reason<input name="correction_reason" type="text" placeholder="e.g. Punch-out failed" required/></label>
          <select name="status" defaultValue={row.status}><option value="present">Present</option><option value="late">Late</option><option value="half_day">Half day</option><option value="absent">Absent</option><option value="leave">Leave</option></select>
          <input name="break_minutes" type="number" min="0" max="1440" defaultValue={row.break_minutes||0} aria-label="Break minutes"/>
          <button className="secondary-action" type="submit" disabled={correctingId===row.id}>{correctingId===row.id?"Saving…":"Save correction"}</button>
        </form>}
      </article>)}</div>}
    </section>
    <p className="staff-footnote"><MapPin size={13}/> GPS access is requested only when you submit a punch. Attendance is not queued offline; a successful server response is required to confirm the punch.</p>
  </section>;
}
