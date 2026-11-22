"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, RotateCcw } from "lucide-react";

const modes = [
  ["content", "Content Studio"], ["task", "Smart Tasks"], ["report", "Report Analyst"],
  ["campaign", "Campaign Insights"], ["general", "AI Assistant"]
] as const;

export default function AiEnginePanel() {
  const [mode, setMode] = useState<(typeof modes)[number][0]>("content");
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

  return <div className="space-y-5">
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-red-50 p-3 text-red-600"><Sparkles size={22}/></span><div><h2 className="text-lg font-bold">SDMA AI Engine</h2><p className="text-sm text-neutral-500">Your agency's AI workspace · Gemini Free Tier compatible</p></div></div>
      <div className="mb-4 flex flex-wrap gap-2">{modes.map(([value,label]) => <button key={value} onClick={() => setMode(value)} className={mode===value ? "rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white" : "rounded-full border px-4 py-2 text-sm text-neutral-700"}>{label}</button>)}</div>
      <label className="mb-2 block text-sm font-semibold">What should the AI help with?</label>
      <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={6000} rows={6} placeholder="Enter your brief, client context or campaign metrics..." className="w-full rounded-xl border border-neutral-300 p-3 text-sm outline-none focus:border-red-500"/>
      <div className="mt-2 flex items-center justify-between"><span className="text-xs text-neutral-500">{prompt.length}/6000 characters</span><button disabled={!prompt.trim()||busy} onClick={generate} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy?<Loader2 className="animate-spin" size={16}/>:<Sparkles size={16}/>}Generate</button></div>
      {error && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
    </section>
    {result && <section className="rounded-2xl border border-neutral-200 bg-white p-5"><div className="mb-3 flex items-center justify-between"><h3 className="font-bold">AI Output</h3><div className="flex gap-2"><button onClick={()=>navigator.clipboard.writeText(result)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs"><Copy size={14}/>Copy</button><button onClick={()=>{setResult("");setPrompt("");}} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs"><RotateCcw size={14}/>Clear</button></div></div><pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-neutral-800">{result}</pre></section>}
    <p className="text-xs text-neutral-500">AI suggestions are drafts only. Nothing is published, assigned or sent automatically. Do not enter passwords, API keys or sensitive client personal data.</p>
  </div>;
}
