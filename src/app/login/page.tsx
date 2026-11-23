"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      // A single document navigation lets the server read the newly persisted Supabase auth cookies.
      // Avoid router.refresh() racing the client-side auth state and triggering duplicate route work.
      window.location.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in. Please try again.");
      setLoading(false);
    }
  }

  return <main className="login-shell">
    <section className="login-card">
      <div className="login-brand"><svg viewBox="0 0 1200 430" role="img" aria-label="Shah Digital Marketing Agency" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="430" rx="8" fill="#050505"/><g fontFamily="Arial, Helvetica, sans-serif" fontWeight="900"><text x="35" y="220" fontSize="250" letterSpacing="-15" fill="#fff">SHAH</text><circle cx="1120" cy="105" r="42" fill="#e31e24"/><text x="40" y="300" fontSize="66" letterSpacing="21" fill="#fff">DIGITAL MARKETING</text><path d="M40 365H145 M1055 365H1160" stroke="#e31e24" strokeWidth="8"/><text x="175" y="390" fontSize="60" letterSpacing="3" fill="#e31e24">AGENCY &amp; ACADEMY</text></g></svg></div>
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