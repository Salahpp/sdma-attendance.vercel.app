"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, Check, Loader2, MessageCircle, Plus, RefreshCw, Send, UserRound } from "lucide-react";

type ContentStatus = "idea" | "planned" | "in_progress" | "review" | "approved" | "scheduled" | "published" | "rejected";
type ContentItem = {
  id: string; title: string; client_id: string | null; platform: string | null;
  content_type: string | null; caption: string | null; status: ContentStatus;
  due_at: string | null; assigned_to: string | null; created_by: string;
  creative_path: string | null; approved_at: string | null; published_at: string | null;
};
type Person = { id: string; full_name: string; role: string };
type Client = { id: string; name: string };
type Comment = { id: string; content_item_id: string; user_id: string; comment: string; created_at: string };

const labels: Record<ContentStatus, string> = {
  idea: "Idea", planned: "Planned", in_progress: "In progress", review: "Needs review",
  approved: "Approved", scheduled: "Scheduled", published: "Published", rejected: "Changes requested"
};
const workflow: ContentStatus[] = ["idea", "planned", "in_progress", "review", "approved", "scheduled", "published", "rejected"];
const managerRoles = ["ceo", "operations_manager", "team_lead", "office_admin"];

export default function ContentCalendarPanel({ role, userId }: { role: string; userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const isManager = managerRoles.includes(role);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [draftComments, setDraftComments] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [contentResult, peopleResult, clientResult, commentResult] = await Promise.all([
      supabase.from("content_items").select("*").order("due_at", { ascending: true, nullsFirst: false }).limit(300),
      supabase.from("profiles").select("id,full_name,role").eq("is_active", true).order("full_name"),
      supabase.from("clients").select("id,name").order("name"),
      supabase.from("content_comments").select("*").order("created_at", { ascending: true }).limit(500)
    ]);
    if (contentResult.error) setError(contentResult.error.message); else setItems((contentResult.data ?? []) as ContentItem[]);
    if (peopleResult.error) setError(peopleResult.error.message); else setPeople((peopleResult.data ?? []) as Person[]);
    if (clientResult.error) setError(clientResult.error.message); else setClients((clientResult.data ?? []) as Client[]);
    if (commentResult.error) setError(commentResult.error.message); else setComments((commentResult.data ?? []) as Comment[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  async function createContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    const title = String(form.get("title") || "").trim();
    if (!title) return;
    setSaving(true); setError(""); setSuccess("");
    const due = String(form.get("due_at") || "");
    const payload = {
      title,
      client_id: String(form.get("client_id") || "") || null,
      platform: String(form.get("platform") || "") || null,
      content_type: String(form.get("content_type") || "") || null,
      caption: String(form.get("caption") || "").trim() || null,
      creative_path: String(form.get("creative_path") || "").trim() || null,
      assigned_to: String(form.get("assigned_to") || "") || null,
      due_at: due ? new Date(due).toISOString() : null,
      created_by: userId,
      status: "idea" as const
    };
    const { error: insertError } = await supabase.from("content_items").insert(payload);
    if (insertError) setError(insertError.message);
    else { setSuccess("Content item added to the calendar."); setShowForm(false); formElement.reset(); await load(); }
    setSaving(false);
  }

  async function changeStatus(item: ContentItem, status: ContentStatus) {
    setError(""); setSuccess("");
    const { error: updateError } = await supabase.from("content_items").update({ status }).eq("id", item.id);
    if (updateError) setError(updateError.message);
    else { setSuccess("Content workflow updated."); await load(); }
  }

  async function addComment(itemId: string) {
    const comment = (draftComments[itemId] || "").trim();
    if (!comment) return;
    setError("");
    const { error: commentError } = await supabase.from("content_comments").insert({ content_item_id: itemId, user_id: userId, comment });
    if (commentError) setError(commentError.message);
    else { setDraftComments(v => ({ ...v, [itemId]: "" })); await load(); }
  }

  const filtered = filter === "all" ? items : items.filter(item => item.status === filter);
  const nameFor = (id: string | null) => people.find(person => person.id === id)?.full_name || "Unassigned";
  const clientFor = (id: string | null) => clients.find(client => client.id === id)?.name || "No client";
  const counts = workflow.reduce((acc, status) => ({ ...acc, [status]: items.filter(item => item.status === status).length }), {} as Record<ContentStatus, number>);

  return <section className="content-workspace">
    <div className="tasks-toolbar">
      <div><h2>Content Calendar</h2><p>Plan creatives, assign production and manage client approvals.</p></div>
      <div className="tasks-actions"><button className="secondary-action" onClick={() => void load()}><RefreshCw size={15}/> Refresh</button><button className="primary-action" onClick={() => setShowForm(v => !v)}><Plus size={16}/> New content</button></div>
    </div>
    <div className="content-metrics">
      <button className={filter === "all" ? "task-filter active" : "task-filter"} onClick={() => setFilter("all")}><span>All content</span><b>{items.length}</b></button>
      {(["idea","in_progress","review","approved","published"] as ContentStatus[]).map(status => <button key={status} className={filter === status ? "task-filter active" : "task-filter"} onClick={() => setFilter(status)}><span>{labels[status]}</span><b>{counts[status]}</b></button>)}
    </div>
    {error && <p className="task-alert error">{error}</p>}{success && <p className="task-alert success">{success}</p>}
    {showForm && <form className="task-form" onSubmit={createContent}>
      <div className="task-form-heading"><b>Create content plan</b><button type="button" onClick={() => setShowForm(false)}>Close</button></div>
      <label>Content title<input name="title" required placeholder="e.g. KITCHALES product reel"/></label>
      <div className="task-form-grid">
        <label>Client<select name="client_id" defaultValue=""><option value="">Select client</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
        <label>Assign to<select name="assigned_to" defaultValue=""><option value="">Unassigned</option>{people.map(person => <option key={person.id} value={person.id}>{person.full_name || person.role}</option>)}</select></label>
        <label>Platform<select name="platform" defaultValue="Instagram"><option>Instagram</option><option>Facebook</option><option>LinkedIn</option><option>YouTube</option><option>Website</option><option>Other</option></select></label>
        <label>Content type<select name="content_type" defaultValue="Reel"><option>Reel</option><option>Carousel</option><option>Static post</option><option>Story</option><option>Ad creative</option><option>Blog</option></select></label>
        <label>Publish / due date<input name="due_at" type="datetime-local"/></label>
        <label>Creative link<input name="creative_path" type="url" placeholder="https://… (optional)"/></label>
      </div>
      <label>Caption / brief<textarea name="caption" rows={3} placeholder="Creative brief, caption, hashtags or client notes"/></label>
      <button className="primary-action" type="submit" disabled={saving}>{saving ? <Loader2 className="spin" size={16}/> : <Plus size={16}/>} Add to calendar</button>
    </form>}
    {loading ? <div className="task-empty"><Loader2 className="spin" size={22}/> Loading content calendar…</div> : filtered.length === 0 ? <div className="task-empty"><CalendarDays size={28}/><b>No content planned</b><span>Add a content item to start the calendar.</span></div> :
      <div className="content-list">{filtered.map(item => {
        const itemComments = comments.filter(comment => comment.content_item_id === item.id);
        const allowedStatuses = isManager ? workflow : [...workflow.slice(0, 4), ...(workflow.includes(item.status) ? [item.status] : [])];
        return <article className="content-card" key={item.id}>
          <div className="content-card-top"><div className="content-title"><b>{item.title}</b><span className={"content-status status-"+item.status}>{labels[item.status]}</span></div><span className="content-client">{clientFor(item.client_id)}</span></div>
          <div className="content-meta"><span>{item.platform || "Platform not set"}</span><span>{item.content_type || "Content"}</span><span><UserRound size={13}/>{nameFor(item.assigned_to)}</span>{item.due_at && <span><CalendarDays size={13}/>{new Date(item.due_at).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>}</div>
          {item.caption && <p className="content-caption">{item.caption}</p>}
          {item.creative_path && <a className="content-link" href={item.creative_path} target="_blank" rel="noreferrer">Open creative reference ↗</a>}
          <div className="content-actions">
            <label>Workflow<select value={item.status} disabled={!isManager && !workflow.slice(0, 4).includes(item.status)} onChange={e => void changeStatus(item, e.target.value as ContentStatus)}>{allowedStatuses.map(status => <option key={status} value={status}>{labels[status]}</option>)}</select></label>
            <button className="secondary-action" onClick={() => setOpenComments(openComments === item.id ? null : item.id)}><MessageCircle size={14}/> Comments ({itemComments.length})</button>
            {item.status === "approved" && <span className="approval-note"><Check size={14}/> Approved</span>}
          </div>
          {openComments === item.id && <div className="content-comments"><div className="content-comment-list">{itemComments.map(comment => <p key={comment.id}><b>{nameFor(comment.user_id)}</b><span>{comment.comment}</span><small>{new Date(comment.created_at).toLocaleString("en-IN")}</small></p>)}</div><div className="content-comment-form"><input value={draftComments[item.id] || ""} onChange={e => setDraftComments(v => ({ ...v, [item.id]: e.target.value }))} placeholder="Add feedback or revision note…"/><button className="primary-action" onClick={() => void addComment(item.id)}><Send size={14}/></button></div></div>}
        </article>;
      })}</div>}
    <p className="content-footnote">Approval and publish actions are restricted by database rules to CEO, Operations Manager, Team Leader and Office Admin. Team members can move assigned work through production and submit it for review.</p>
  </section>;
}
