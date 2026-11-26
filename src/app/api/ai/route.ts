import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_MODES = new Set(["content", "calendar", "task", "report", "campaign", "general"]);
const MAX_INPUT = 6000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (!profile?.is_active) return NextResponse.json({ error: "Active agency account required." }, { status: 403 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({
    error: "AI engine is configured but not connected. Add GEMINI_API_KEY in Vercel Environment Variables.",
    code: "AI_KEY_MISSING"
  }, { status: 503 });

  let body: { mode?: string; prompt?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const mode = String(body.mode || "general");
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!ALLOWED_MODES.has(mode)) return NextResponse.json({ error: "Unsupported AI mode." }, { status: 400 });
  if (!prompt || prompt.length > MAX_INPUT) return NextResponse.json({ error: "Enter a prompt up to 6,000 characters." }, { status: 400 });

  const instructions: Record<string, string> = {
    content: "Act as a senior social media content strategist for Shah Digital Marketing Agency. Create practical content ideas, hooks, captions, creative direction and CTA. Ask no invented facts; label assumptions.",
    calendar: "Act as a senior monthly social media planner. Create a practical 30-day content calendar. For each day include day/date placeholder, content pillar, format, hook, caption, creative direction and CTA. Balance awareness, education, trust, engagement and conversion. Do not invent client facts; clearly label assumptions.",
    task: "Act as an agency operations assistant. Convert the request into clear, realistic task suggestions with priority, owner role suggestion and due-date suggestion. Do not claim tasks have been created.",
    report: "Act as a performance marketing analyst. Summarize only supplied metrics, calculate only when inputs allow, identify missing data and provide actionable recommendations. Never invent metrics.",
    campaign: "Act as a performance marketing strategist. Analyze only supplied campaign details, identify issues and suggest tests. Never invent performance data or claim changes were applied.",
    general: "Act as a careful internal assistant for a digital marketing agency. Be concise, practical and transparent about uncertainty."
  };

  try {
    const configuredModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    // Avoid retired models. Try the configured model, then current supported fallbacks.
    const models = [configuredModel, "gemini-3.8-flash", "gemini-2.5-flash"].filter((m,i,a)=>a.indexOf(m)===i);
    let response: Response | null = null;
    let model = configuredModel;
    for (const candidate of models) {
      model = candidate;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000);
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate)}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: instructions[mode] }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 1200 }
          }),
          signal: controller.signal,
          cache: "no-store"
        });
        // Fall through to another model for missing models, rate limits and transient provider errors.
        if (response.status !== 404 && response.status !== 429 && response.status < 500) break;
        if (candidate === models[models.length - 1]) break;
      } finally {
        clearTimeout(timeout);
      }
    }
    const data = await response!.json().catch(() => ({}));
    if (!response!.ok) {
      // Keep provider diagnostics server-side; never return raw provider payloads or secrets.
      const providerMessage = typeof data?.error?.message === "string" ? data.error.message : "";
      const status = response!.status;
      const failure = status === 429
        ? { error: "Gemini request limit reached. Please wait and try again.", code: "RATE_LIMIT", httpStatus: 429 }
        : status === 400
          ? { error: "Gemini rejected the request. Check the configured model and API settings.", code: "GEMINI_BAD_REQUEST", httpStatus: 502 }
          : status === 401 || status === 403
            ? { error: "Gemini API authentication or permission failed. Verify the API key and its restrictions in Google AI Studio.", code: "GEMINI_AUTH_ERROR", httpStatus: 502 }
            : status === 404
              ? { error: "The configured Gemini model was not found. Check GEMINI_MODEL.", code: "GEMINI_MODEL_NOT_FOUND", httpStatus: 502 }
              : status >= 500
                ? { error: "Gemini is temporarily unavailable. Please try again shortly.", code: "GEMINI_UNAVAILABLE", httpStatus: 502 }
                : { error: "Gemini could not process this request. Please review the prompt and try again.", code: "GEMINI_PROVIDER_ERROR", httpStatus: 502 };
      console.error("[AI Engine] Gemini request failed", {
        status,
        model,
        mode,
        providerMessage: providerMessage.slice(0, 300)
      });
      return NextResponse.json({ error: failure.error, code: failure.code }, { status: failure.httpStatus });
    }
    const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
    if (!text) return NextResponse.json({ error: "The AI provider returned an empty response." }, { status: 502 });
    return NextResponse.json({ text, model, mode });
  } catch {
    return NextResponse.json({ error: "AI request timed out or could not connect." }, { status: 502 });
  }
}
