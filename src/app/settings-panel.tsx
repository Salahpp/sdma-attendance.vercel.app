"use client";

import { useEffect, useState } from "react";
import { Settings, ShieldCheck, Sparkles, UserRound, RefreshCw, CircleHelp } from "lucide-react";

type Props = { fullName: string; role: string; userId: string };
const labels: Record<string,string> = { ceo:"CEO & Founder", operations_manager:"Operations Manager", team_lead:"Team Lead", office_admin:"Office Admin", accounts:"Accounts", marketer:"Digital Marketer", designer:"Graphic Designer", staff:"Staff" };

export default function SettingsPanel({fullName,role,userId}:Props) {
  const [aiStatus,setAiStatus] = useState<"checking"|"connected"|"missing"|"error">("checking");
  async function check() {
    setAiStatus("checking");
    try { const r=await fetch("/api/ai/status",{cache:"no-store"}); const d=await r.json(); setAiStatus(r.ok && d.configured ? "connected" : r.ok ? "missing" : "error"); }
    catch { setAiStatus("error"); }
  }
  useEffect(()=>{void check();},[]);
  return <section className="settings-workspace">
    <div className="tasks-toolbar"><div><h2>Workspace Settings</h2><p>Account details, access overview and connected services.</p></div><Settings size={22}/></div>
    <div className="settings-grid">
      <article className="settings-card"><span className="settings-icon"><UserRound size={20}/></span><h3>My account</h3><dl><div><dt>Name</dt><dd>{fullName}</dd></div><div><dt>Role</dt><dd>{labels[role] || role}</dd></div><div><dt>User ID</dt><dd className="settings-id">{userId}</dd></div></dl><p className="settings-foot">Account and role changes are managed by authorized agency administrators.</p></article>
      <article className="settings-card"><span className="settings-icon"><Sparkles size={20}/></span><h3>AI provider</h3><p className="settings-muted">Gemini API connection status. Secret values are never displayed here.</p><div className="settings-status"><i className={"settings-dot "+aiStatus}/><b>{aiStatus==="connected"?"API key configured":aiStatus==="missing"?"API key not configured":aiStatus==="error"?"Unable to check connection":"Checking configuration…"}</b></div><button className="secondary-action" onClick={()=>void check()}><RefreshCw size={14}/> Check again</button><p className="settings-foot">Free-tier availability and quotas are controlled by Google AI Studio. No paid fallback is configured.</p></article>
      <article className="settings-card"><span className="settings-icon"><ShieldCheck size={20}/></span><h3>Access & approvals</h3><p className="settings-muted">Workspace access follows the existing SDMA role policy.</p><ul className="settings-list"><li>Team members submit work for review.</li><li>Managers review and approve content.</li><li>Finance access is limited to authorized roles.</li><li>AI suggestions remain drafts until a person acts.</li></ul></article>
      <article className="settings-card"><span className="settings-icon"><CircleHelp size={20}/></span><h3>Support & safety</h3><p className="settings-muted">For account access or workspace issues, contact your agency administrator.</p><div className="settings-callout">Never share passwords, API keys or confidential client information in support messages.</div></article>
    </div>
  </section>;
}
