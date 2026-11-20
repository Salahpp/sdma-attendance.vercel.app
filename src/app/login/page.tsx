"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="login-shell">
    <section className="login-card">
      <div className="login-brand"><div className="brand-mark">S</div><div><b>SHAH<span>.</span></b><small>OFFICE OS</small></div></div>
      <div className="login-intro"><div className="eyebrow">TEAM WORKSPACE</div><h1>Welcome back.</h1><p>Sign in to manage your agency operations.</p></div>
      <form onSubmit={submit}>
        <label>Email address<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password"/></label>
        {error && <div className="login-error" role="alert">{error}</div>}
        <button type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in to workspace"}</button>
      </form>
      <small className="login-help">Access is provided by your agency administrator.</small>
    </section>
  </main>;
}