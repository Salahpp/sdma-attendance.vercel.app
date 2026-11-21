"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password,setPassword] = useState("");
  const [confirm,setConfirm] = useState("");
  const [error,setError] = useState("");
  const [saving,setSaving] = useState(false);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setError("");
    if(password!==confirm){setError("Passwords do not match.");return;}
    if(password.length<12||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password)){
      setError("Use at least 12 characters with uppercase, lowercase and a number.");return;
    }
    setSaving(true);
    try {
      const supabase=createClient();
      const {data,error:fnError}=await supabase.functions.invoke("staff-password-management",{body:{action:"complete",new_password:password}});
      if(fnError||data?.error)throw new Error(data?.error||fnError?.message||"Could not update password.");
      router.replace("/");
      router.refresh();
    } catch(e) {
      setError(e instanceof Error?e.message:"Could not update password.");
    } finally {setSaving(false);}
  }

  return <main className="login-shell">
    <section className="login-card password-setup-card">
      <div className="login-brand"><div className="brand-mark">S</div><div><b>SHAH<span>.</span></b><small>OFFICE OS</small></div></div>
      <div className="login-intro"><div className="eyebrow">FIRST LOGIN SECURITY</div><h1>Set your password.</h1><p>Your administrator provided a temporary password. Create a private password before entering the workspace.</p></div>
      <div className="password-setup-note"><ShieldCheck size={17}/> Your new password is private and only you should know it.</div>
      <form onSubmit={submit}>
        <label>New password<input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 12 characters"/></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Enter it again"/></label>
        <small className="login-help">Use 12+ characters, including uppercase, lowercase and a number.</small>
        {error&&<div className="login-error" role="alert">{error}</div>}
        <button type="submit" disabled={saving}>{saving?<><Loader2 className="spin" size={15}/> Saving…</>:<><KeyRound size={15}/> Save new password</>}</button>
      </form>
    </section>
  </main>;
}
