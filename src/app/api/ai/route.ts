import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_MODES = new Set(["content", "calendar", "task", "report", "campaign", "general"]);
const MAX_INPUT = 6000;

const instructions: Record<string, string> = {
  content: "Act as a senior social media content strategist for Shah Digital Marketing Agency. Create practical content ideas, hooks, captions, creative direction and CTA. Ask no invented facts; label assumptions.",
  calendar: "Act as a senior monthly social media planner. Create a practical 30-day content calendar. For each day include day/date placeholder, content pillar, format, hook, caption, creative direction and CTA. Balance awareness, education, trust, engagement and conversion. Do not invent client facts; clearly label assumptions.",
  task: "Act as an agency operations assistant. Convert the request into clear, realistic task suggestions with priority, owner role suggestion and due-date suggestion. Do not claim tasks have been created.",
  report: "Act as a performance marketing analyst. Summarize only supplied metrics, calculate only when inputs allow, identify missing data and provide actionable recommendations. Never invent metrics.",
  campaign: "Act as a performance marketing strategist. Analyze only supplied campaign details, identify issues and suggest tests. Never invent performance data or claim changes were applied.",
  general: "Act as a careful internal assistant for a digital marketing agency. Be concise, practical and transparent about uncertainty."
};

async function callGemini(prompt: string, mode: string, key: string) {
  const configured = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const models = [configured, "gemini-2.5-flash"].filter((m,i,a)=>a.indexOf(m)===i);
  let last: Response | null = null;
  for (const model of models) {
    const controller = new AbortController(); const timer = setTimeout(()=>controller.abort(),18000);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method:"POST", headers:{"Content-Type":"application/json","x-goog-api-key":key},
        body:JSON.stringify({systemInstruction:{parts:[{text:instructions[mode]}]},contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:0.4,maxOutputTokens:1200}}),
        signal:controller.signal,cache:"no-store"
      });
      last=res;
      if(res.ok) { const data=await res.json(); const text=data?.candidates?.[0]?.content?.parts?.map((p:{text?:string})=>p.text||"").join("").trim(); if(text) return {text,provider:"Gemini",model}; }
      if(res.status<500 && res.status!==429 && res.status!==404) break;
    } catch {} finally {clearTimeout(timer);}
  }
  throw new Error(last?.status===429?"Gemini rate limit":last?.status===404?"Gemini model not found":"Gemini unavailable");
}

async function callGroq(prompt: string, mode: string, key: string) {
  const model=process.env.GROQ_MODEL||"llama-3.3-70b-versatile";
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),18000);
  try {
    const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},
      body:JSON.stringify({model,messages:[{role:"system",content:instructions[mode]},{role:"user",content:prompt}],temperature:0.4,max_tokens:1200}),
      signal:controller.signal,cache:"no-store"
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(res.status===429?"Groq rate limit":res.status>=500?"Groq unavailable":"Groq provider error");
    const text=data?.choices?.[0]?.message?.content?.trim();
    if(!text) throw new Error("Empty provider response");
    return {text,provider:"Groq (Llama)",model};
  } finally {clearTimeout(timer);}
}

export async function POST(request: Request) {
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return NextResponse.json({error:"Authentication required."},{status:401});
  const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
  if(!profile?.is_active)return NextResponse.json({error:"Active agency account required."},{status:403});

  let body:{mode?:string;prompt?:string};
  try{body=await request.json();}catch{return NextResponse.json({error:"Invalid request body."},{status:400});}
  const mode=String(body.mode||"general"),prompt=typeof body.prompt==="string"?body.prompt.trim():"";
  if(!ALLOWED_MODES.has(mode))return NextResponse.json({error:"Unsupported AI mode."},{status:400});
  if(!prompt||prompt.length>MAX_INPUT)return NextResponse.json({error:"Enter a prompt up to 6,000 characters."},{status:400});

  const geminiKey=process.env.GEMINI_API_KEY,groqKey=process.env.GROQ_API_KEY;
  if(!geminiKey&&!groqKey)return NextResponse.json({error:"AI providers are not configured. Add GEMINI_API_KEY or GROQ_API_KEY in Vercel Environment Variables.",code:"AI_KEYS_MISSING"},{status:503});
  const failures:string[]=[];
  if(geminiKey)try{return NextResponse.json(await callGemini(prompt,mode,geminiKey));}catch(e){failures.push(String(e));console.warn("[AI Engine] Gemini failed; attempting fallback",{mode,error:String(e).slice(0,180)});}
  if(groqKey)try{return NextResponse.json(await callGroq(prompt,mode,groqKey));}catch(e){failures.push(String(e));console.error("[AI Engine] Groq fallback failed",{mode,error:String(e).slice(0,180)});}
  return NextResponse.json({error:"All configured AI providers failed. Please try again later.",code:"AI_PROVIDERS_FAILED"},{status:502});
}
