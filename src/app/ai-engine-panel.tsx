"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, RotateCcw, WandSparkles, PenLine, ListTodo, ChartNoAxesCombined, Megaphone, Bot, ArrowUpRight, ShieldCheck } from "lucide-react";

const modes = [
  { id: "content", label: "Content Studio", hint: "Captions, reels & calendars", icon: PenLine },
  { id: "task", label: "Smart Tasks", hint: "Plan and prioritize work", icon: ListTodo },
  { id: "report", label: "Report Analyst", hint: "Understand performance", icon: ChartNoAxesCombined },
  { id: "campaign", label: "Campaign Insights", hint: "Optimize ad campaigns", icon: Megaphone },
  { id: "general", label: "AI Assistant", hint: "Ask your agency copilot", icon: Bot }
] as const;

const suggestions: Record<(typeof modes)[number]["id"], string> = {
  content: "Create a 7-day Instagram content plan for a premium interior design brand. Include reels, carousels, hooks, captions and CTAs.",
  task: "Create a practical daily task checklist for a digital marketing team managing 5 client accounts.",
  report: "Analyze this month's campaign performance: Spend ₹25,000, leads 120, sales 8, revenue ₹1,20,000. Give CPL, ROAS and recommendations.",
  campaign: "Suggest a Meta Ads optimization plan for a local interior design lead generation campaign.",
  general: "Help me plan today's priorities as the founder of a digital marketing agency."
};

export default function AiEnginePanel() {
  const [mode, setMode] = useState<(typeof modes)[number]["id"]>("content");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!prompt.trim() || busy) return;
    setBusy(true); setError(""); setResult("");
    try {
      const response = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, prompt })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI request failed.");
      setResult(data.text || "");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to reach AI engine."); }
    finally { setBusy(false); }
  }

  const activeMode = modes.find(item => item.id === mode)!;
  return <div className="ai-engine">
    <section className="ai-hero">
      <div className="ai-hero-orb ai-orb-one"/><div className="ai-hero-orb ai-orb-two"/>
      <div className="ai-hero-content">
        <div className="ai-eyebrow"><span className="ai-live-dot"/> SHAH DIGITAL · INTELLIGENCE WORKSPACE</div>
        <div className="ai-hero-title"><div><h2>Meet your agency copilot.</h2><p>Think faster. Create better. Grow smarter.</p></div><span className="ai-hero-icon"><Sparkles size={28}/></span></div>
        <div className="ai-hero-bottom"><span><WandSparkles size={14}/> Gemini-powered assistant</span><span><ShieldCheck size={14}/> Private server-side API</span><span className="ai-free-pill">FREE TIER SETUP</span></div>
      </div>
    </section>

    <div className="ai-workspace-grid">
      <section className="ai-main-card">
        <div className="ai-section-heading"><div><span className="ai-step">01 / CHOOSE A WORKSPACE</span><h3>What are we working on?</h3><p>Select an AI tool to get started.</p></div><Sparkles size={20}/></div>
        <div className="ai-mode-grid">{modes.map(({id,label,hint,icon:Icon})=><button type="button" key={id} onClick={()=>{setMode(id);setPrompt("");setResult("");setError("");}} className={mode===id?"ai-mode active":"ai-mode"}><span className="ai-mode-icon"><Icon size={19}/></span><span className="ai-mode-copy"><b>{label}</b><small>{hint}</small></span><ArrowUpRight size={15} className="ai-mode-arrow"/></button>)}</div>
        <div className="ai-divider"/>
        <div className="ai-section-heading ai-prompt-heading"><div><span className="ai-step">02 / YOUR BRIEF</span><h3>Give your copilot a direction</h3><p>Share the context. Get a useful first draft.</p></div><span className="ai-selected-label">{activeMode.label}</span></div>
        <textarea className="ai-prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={6000} rows={7} placeholder="Tell us what you want to create, analyze or plan..."/>
        <div className="ai-prompt-footer"><button type="button" className="ai-suggestion" onClick={()=>setPrompt(suggestions[mode])}><WandSparkles size={14}/> Try a sample prompt</button><span>{prompt.length.toLocaleString()}/6,000</span></div>
        {error && <div className="ai-error">{error}</div>}
        <button type="button" disabled={!prompt.trim()||busy} onClick={generate} className="ai-generate">{busy?<Loader2 size={17} className="ai-spin"/>:<Sparkles size={17}/>} {busy?"Thinking...":"Generate with AI"} <ArrowUpRight size={16}/></button>
      </section>
      <aside className="ai-side-column">
        <section className="ai-side-card ai-side-feature"><span className="ai-side-icon"><Sparkles size={19}/></span><h3>Your ideas, upgraded.</h3><p>From campaign planning to daily operations, get a practical starting point in seconds.</p><div className="ai-feature-line"><span/> Ready for your next big idea</div></section>
        <section className="ai-side-card"><h4>QUICK START</h4><p>Not sure what to ask?</p>{["Build a monthly content calendar","Review campaign performance","Plan my team's daily tasks"].map((item,i)=><button key={item} type="button" className="ai-quick-link" onClick={()=>{setMode(i===0?"content":i===1?"report":"task");setPrompt(i===0?suggestions.content:i===1?suggestions.report:suggestions.task);setResult("");setError("");}}>{item}<ArrowUpRight size={14}/></button>)}</section>
        <div className="ai-safety-note"><ShieldCheck size={16}/><span><b>Human-approved by design</b><small>AI outputs are drafts. Nothing is sent, published or assigned automatically.</small></span></div>
      </aside>
    </div>
    {result && <section className="ai-result-card"><div className="ai-result-head"><div><span className="ai-step">YOUR GENERATED OUTPUT</span><h3>{activeMode.label} result</h3></div><div className="ai-result-actions"><button type="button" onClick={()=>navigator.clipboard.writeText(result)}><Copy size={14}/> Copy</button><button type="button" onClick={()=>{setResult("");}}><RotateCcw size={14}/> Clear</button></div></div><pre>{result}</pre></section>}
    <div className="ai-footer-note"><ShieldCheck size={14}/> Do not enter passwords, API keys or sensitive personal client data.</div>
  </div>;
}
