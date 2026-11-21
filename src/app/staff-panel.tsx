"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Database } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { RefreshCw, ShieldCheck, UserRound, Loader2, Save, Users, UserPlus, X, Mail } from "lucide-react";

type Member = { id: string; full_name: string; email: string | null; phone: string | null; job_title: string | null; department: string | null; role: string; is_active: boolean };
const roles = [
  ["ceo","CEO"],["operations_manager","Operations Manager"],["team_lead","Team Leader"],
  ["office_admin","Office Admin"],["marketer","Digital Marketer"],["designer","Graphic Designer"],
  ["accounts","Accounts"],["staff","Staff"]
] as const;

export default function StaffPanel({ role, userId }: { role: string; userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [members,setMembers] = useState<Member[]>([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState<string | null>(null);
  const [inviting,setInviting] = useState(false);
  const [showInvite,setShowInvite] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [search,setSearch] = useState("");
  const canManage = role === "ceo" || role === "operations_manager";
  const assignableRoles = roles.filter(([value]) => value !== "ceo" && (role === "ceo" || value !== "operations_manager"));

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const {data,error} = await supabase.from("profiles").select("id,full_name,email,phone,job_title,department,role,is_active").order("full_name");
    if (error) setError(error.message); else setMembers((data ?? []) as Member[]);
    setLoading(false);
  },[supabase]);

  useEffect(() => { void load(); },[load]);

  async function inviteStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviting(true); setError(""); setNotice("");
    const form = new FormData(event.currentTarget);
    const payload = {
      full_name: String(form.get("new_full_name") || "").trim(),
      email: String(form.get("new_email") || "").trim().toLowerCase(),
      phone: String(form.get("new_phone") || "").trim(),
      job_title: String(form.get("new_job_title") || "").trim(),
      department: String(form.get("new_department") || "").trim(),
      role: String(form.get("new_role") || "staff"),
    };
    const {data,error} = await supabase.functions.invoke("ceo-create-staff", { body: payload });
    if (error || data?.error) {
      setError(data?.error || error?.message || "Could not send staff invitation.");
    } else {
      setNotice(`Invitation sent to ${payload.email}. They can create their password from the email link.`);
      setShowInvite(false);
      await load();
    }
    setInviting(false);
  }

  async function saveMember(event: FormEvent<HTMLFormElement>, member: Member) {
    event.preventDefault(); setSaving(member.id); setError(""); setNotice("");
    const form = new FormData(event.currentTarget);
    const payload = {
      full_name: String(form.get("full_name") || "").trim(),
      phone: String(form.get("phone") || "").trim() || null,
      job_title: String(form.get("job_title") || "").trim() || null,
      department: String(form.get("department") || "").trim() || null,
      role: String(form.get("role") || member.role) as Database["public"]["Enums"]["sdma_role"],
      is_active: form.get("is_active") === "on"
    };
    const {error} = await supabase.from("profiles").update(payload).eq("id",member.id);
    if (error) setError(error.message);
    else { setNotice("Staff profile updated."); await load(); }
    setSaving(null);
  }

  const filtered = members.filter(m => [m.full_name,m.email,m.job_title,m.department,m.role].some(v => (v || "").toLowerCase().includes(search.toLowerCase())));
  const activeCount = members.filter(m => m.is_active).length;

  return <section className="staff-workspace">
    <div className="tasks-toolbar"><div><h2>Team & Roles</h2><p>Manage staff profiles, departments and access levels.</p></div><div className="staff-toolbar-actions"><button className="secondary-action" onClick={() => void load()}><RefreshCw size={15}/> Refresh</button>{canManage && <button className="primary-action" onClick={() => {setShowInvite(v=>!v);setError("");setNotice("");}}><UserPlus size={15}/> Add Staff</button>}</div></div>
    {showInvite && canManage && <form className="staff-invite-panel" onSubmit={e=>void inviteStaff(e)}>
      <div className="staff-invite-heading"><div><h3>Invite a new team member</h3><p>We’ll email a secure invitation link so they can set their own password.</p></div><button type="button" className="staff-close" onClick={()=>setShowInvite(false)} aria-label="Close"><X size={18}/></button></div>
      <div className="staff-invite-grid">
        <label>Full name *<input name="new_full_name" required placeholder="Staff full name"/></label>
        <label>Work email *<input name="new_email" type="email" required placeholder="name@example.com"/></label>
        <label>Phone number<input name="new_phone" type="tel" placeholder="+91"/></label>
        <label>Job title<input name="new_job_title" placeholder="e.g. Digital Marketer"/></label>
        <label>Department<input name="new_department" placeholder="e.g. Marketing"/></label>
        <label>Access role *<select name="new_role" defaultValue="staff">{assignableRoles.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <div className="staff-invite-actions"><button className="primary-action" type="submit" disabled={inviting}>{inviting ? <Loader2 className="spin" size={15}/> : <Mail size={15}/>} {inviting ? "Sending invitation…" : "Send invitation"}</button><span>Staff will set their own password from the email.</span></div>
    </form>}
    <div className="staff-summary"><div><Users size={18}/><span>Total team</span><b>{members.length}</b></div><div><UserRound size={18}/><span>Active staff</span><b>{activeCount}</b></div><div><ShieldCheck size={18}/><span>Inactive</span><b>{members.length-activeCount}</b></div></div>
    <input className="staff-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, role or department…"/>
    {error && <p className="task-alert error">{error}</p>}{notice && <p className="task-alert success">{notice}</p>}
    {!canManage && <p className="task-alert">You have read-only access to the team directory.</p>}
    {loading ? <div className="task-empty"><Loader2 className="spin" size={22}/> Loading team…</div> : filtered.length === 0 ? <div className="task-empty">No team members found.</div> :
      <div className="staff-list">{filtered.map(member=><form key={member.id} className="staff-card" onSubmit={e=>void saveMember(e,member)}>
        <div className="staff-card-head"><div className="staff-avatar">{(member.full_name || member.email || "S").slice(0,1).toUpperCase()}</div><div className="staff-identity"><b>{member.full_name || "Name not set"} {member.id===userId && <small>(You)</small>}</b><span>{member.email || "No email on profile"}</span></div><span className={member.is_active ? "staff-status active" : "staff-status"}>{member.is_active ? "Active" : "Inactive"}</span></div>
        <div className="staff-fields">
          <label>Full name<input name="full_name" defaultValue={member.full_name}/></label>
          <label>Phone<input name="phone" defaultValue={member.phone || ""}/></label>
          <label>Job title<input name="job_title" defaultValue={member.job_title || ""}/></label>
          <label>Department<input name="department" defaultValue={member.department || ""}/></label>
          <label>Access role<select name="role" defaultValue={member.role} disabled={!canManage || member.id===userId}>{assignableRoles.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label className="staff-active-toggle"><input name="is_active" type="checkbox" defaultChecked={member.is_active} disabled={!canManage || member.id===userId}/> Active account</label>
        </div>
        {canManage && <button className="primary-action staff-save" type="submit" disabled={saving===member.id}>{saving===member.id ? <Loader2 className="spin" size={15}/> : <Save size={15}/>} Save changes</button>}
      </form>)}</div>}
    <p className="staff-footnote">New staff accounts are created through a secure email invitation. Existing profiles can be edited here.</p>
  </section>;
}
