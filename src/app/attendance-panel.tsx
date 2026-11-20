"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Camera, MapPin, Clock3, LogIn, LogOut, Loader2, RefreshCw, ShieldCheck, Users } from "lucide-react";

type TeamMember = {id:string;full_name:string;role:string;is_active:boolean};
type AttendanceRow = {
  id:string; user_id:string; attendance_date:string; check_in:string|null; check_out:string|null;
  check_in_lat:number|null; check_in_lng:number|null; check_out_lat:number|null; check_out_lng:number|null;
  check_in_selfie_path:string|null; check_out_selfie_path:string|null; status:string;
};
function officeDate() {
  const parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const part = (type:string) => parts.find(p => p.type === type)?.value || "";
  return part("year")+"-"+part("month")+"-"+part("day");
}
function timeLabel(value:string|null) {
  return value ? new Date(value).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"}) : "—";
}

export default function AttendancePanel({userId,role}:{userId:string;role:string}) {
  const supabase = useMemo(()=>createClient(),[]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const [record,setRecord] = useState<AttendanceRow|null>(null);
  const [teamRows,setTeamRows] = useState<AttendanceRow[]>([]);
  const [teamMembers,setTeamMembers] = useState<TeamMember[]>([]);
  const canMonitorTeam=["ceo","operations_manager","team_lead","office_admin"].includes(role);
  const [loading,setLoading] = useState(true);
  const [cameraReady,setCameraReady] = useState(false);
  const [photo,setPhoto] = useState<Blob|null>(null);
  const [photoUrl,setPhotoUrl] = useState("");
  const [note,setNote] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");

  const load = useCallback(async()=>{
    setLoading(true); setError("");
    const {data,error}=await supabase.from("attendance").select("*").eq("user_id",userId).eq("attendance_date",officeDate()).maybeSingle();
    if(error) setError(error.message); else setRecord(data as AttendanceRow|null);
    if(canMonitorTeam){
      const [attendanceResult,peopleResult]=await Promise.all([
        supabase.from("attendance").select("*").eq("attendance_date",officeDate()).order("check_in",{ascending:true}),
        supabase.from("profiles").select("id,full_name,role,is_active").eq("is_active",true).order("full_name")
      ]);
      if(attendanceResult.error)setError(attendanceResult.error.message);else setTeamRows((attendanceResult.data??[]) as AttendanceRow[]);
      if(peopleResult.error)setError(peopleResult.error.message);else setTeamMembers((peopleResult.data??[]) as TeamMember[]);
    }
    setLoading(false);
  },[supabase,userId,canMonitorTeam]);
  useEffect(()=>{void load();},[load]);
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
    setBusy(true);setError("");setMessage("");
    try {
      const position=await new Promise<GeolocationPosition>((resolve,reject)=>{
        if(!navigator.geolocation){reject(new Error("Location access is not supported on this device."));return;}
        navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:20000,maximumAge:0});
      });
      const isCheckIn=!record?.check_in;
      const action=isCheckIn?"check-in":"check-out";
      const path=userId+"/"+officeDate()+"/"+action+"-"+crypto.randomUUID()+".jpg";
      const {error:uploadError}=await supabase.storage.from("attendance-selfies").upload(path,photo,{contentType:"image/jpeg",upsert:false});
      if(uploadError) throw uploadError;
      const args={p_lat:position.coords.latitude,p_lng:position.coords.longitude,p_selfie_path:path,p_note:note.trim()||null};
      const rpcResult=isCheckIn?await supabase.rpc("attendance_check_in",args):await supabase.rpc("attendance_check_out",args);
      if(rpcResult.error) throw rpcResult.error;
      setPhoto(null);setPhotoUrl("");setNote("");
      setMessage(isCheckIn?"Check-in recorded successfully.":"Check-out recorded successfully.");
      await load();
    } catch(e) {
      setError(e instanceof Error?e.message:"Attendance punch failed. Please try again.");
    } finally {setBusy(false);}
  }

  const checkedIn=Boolean(record?.check_in);
  const checkedOut=Boolean(record?.check_out);
  const start=record?.check_in?new Date(record.check_in).getTime():0;
  const end=record?.check_out?new Date(record.check_out).getTime():Date.now();
  const hours=checkedIn?Math.max(0,(end-start)/3600000):0;
  const duration=checkedIn?Math.floor(hours)+"h "+Math.floor((hours%1)*60)+"m":"—";

  return <section className="attendance-workspace">
    <div className="tasks-toolbar"><div><h2>Attendance</h2><p>Daily selfie and GPS verified check-in / check-out.</p></div><button className="secondary-action" onClick={()=>void load()}><RefreshCw size={15}/> Refresh</button></div>
    <div className="attendance-date"><div><span>Today · India Standard Time</span><b>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Kolkata"})}</b></div><span className={checkedOut?"attendance-done":checkedIn?"attendance-live":"attendance-pending"}>{checkedOut?"Day completed":checkedIn?"Checked in":"Not checked in"}</span></div>
    <div className="attendance-cards">
      <article><span>Check-in</span><b>{timeLabel(record?.check_in||null)}</b><small>{record?.check_in_lat!=null?<a target="_blank" rel="noreferrer" href={"https://maps.google.com/?q="+record.check_in_lat+","+record.check_in_lng}>View check-in location</a>:"No punch recorded"}</small></article>
      <article><span>Check-out</span><b>{timeLabel(record?.check_out||null)}</b><small>{record?.check_out_lat!=null?<a target="_blank" rel="noreferrer" href={"https://maps.google.com/?q="+record.check_out_lat+","+record.check_out_lng}>View check-out location</a>:"Awaiting check-out"}</small></article>
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
    {canMonitorTeam&&<section className="team-attendance"><div className="panel-head"><div><h3>Team attendance</h3><p>Today’s check-in status across active staff</p></div><Users size={18}/></div><div className="team-attendance-list">{teamMembers.map(person=>{const row=teamRows.find(r=>r.user_id===person.id);return <article key={person.id}><div className="team-person"><b>{person.full_name||"Staff member"}</b><small>{person.role.replaceAll("_"," ")}</small></div><span className={row?.check_in?(row.check_out?"staff-status active":"attendance-live"):"attendance-pending"}>{row?.check_out?"Completed":row?.check_in?"Working":"Not checked in"}</span><time>{timeLabel(row?.check_in||null)}</time><time>{timeLabel(row?.check_out||null)}</time></article>;})}</div></section>}
    <p className="staff-footnote"><MapPin size={13}/> GPS access is requested only when you submit a punch. Attendance is not queued offline; a successful server response is required to confirm the punch.</p>
  </section>;
}
