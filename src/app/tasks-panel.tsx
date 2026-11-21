"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, RefreshCw, CalendarClock, UserRound, CircleCheck, Loader2 } from "lucide-react";

type Task = {
  id: string; title: string; description: string | null; client_name: string | null;
  project_name: string | null; assigned_to: string | null; due_date: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "review" | "completed" | "blocked";
  category: string | null; created_at: string; project_id: string | null;
};
type Person = { id: string; full_name: string; role: string };
type Client = { id: string; name: string };
type Project = { id: string; client_id: string | null; name: string; status: string };

const statusLabels: Record<Task["status"], string> = {
  todo: "To do", in_progress: "In progress", review: "Review", completed: "Completed", blocked: "Blocked"
};
const priorityLabels: Record<Task["priority"], string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };

export default function TasksPanel({ role, userId }: { role: string; userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const canAssign = ["ceo", "operations_manager", "team_lead", "office_admin"].includes(role);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [taskResult, peopleResult, clientResult, projectResult] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(200),
      canAssign ? supabase.from("profiles").select("id,full_name,role").eq("is_active", true).order("full_name") : Promise.resolve({ data: [], error: null }),
      canAssign ? supabase.from("clients").select("id,name").order("name") : Promise.resolve({ data: [], error: null }),
      canAssign ? supabase.from("projects").select("id,client_id,name,status").order("name") : Promise.resolve({ data: [], error: null })
    ]);
    if (taskResult.error) setError(taskResult.error.message);
    else setTasks((taskResult.data ?? []) as Task[]);
    if (peopleResult.error) setError(peopleResult.error.message);
    else setPeople((peopleResult.data ?? []) as Person[]);
    if (clientResult?.error) setError(clientResult.error.message);
    else setClients((clientResult?.data ?? []) as Client[]);
    if (projectResult?.error) setError(projectResult.error.message);
    else setProjects((projectResult?.data ?? []) as Project[]);
    setLoading(false);
  }, [supabase, canAssign]);

  useEffect(() => { void load(); }, [load]);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; setSaving(true); setError(""); setSuccess("");
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    if (!title) { setError("Task title is required."); setSaving(false); return; }
    const payload = {
      title, description: String(form.get("description") || "").trim() || null,
      client_name: clients.find(client => client.id === String(form.get("client_id") || ""))?.name || null,
      project_name: projects.find(project => project.id === String(form.get("project_id") || ""))?.name || null,
      project_id: String(form.get("project_id") || "") || null,
      assigned_to: String(form.get("assigned_to") || "") || null,
      due_date: String(form.get("due_date") || "") || null,
      priority: String(form.get("priority") || "medium") as Task["priority"],
      category: String(form.get("category") || "").trim() || null,
      created_by: userId
    };
    const { data, error: insertError } = await supabase.from("tasks").insert(payload).select("id").single();
    if (insertError) setError(insertError.message);
    else {
      if (data?.id) await supabase.from("task_activity").insert({ task_id: data.id, actor_id: userId, action: "created", details: { title } });
      setSuccess("Task created successfully."); formElement.reset(); setSelectedClientId(""); setShowForm(false); await load();
    }
    setSaving(false);
  }

  async function changeStatus(task: Task, status: Task["status"]) {
    setError(""); setSuccess("");
    const { error: updateError } = await supabase.from("tasks").update({
      status, completed_at: status === "completed" ? new Date().toISOString() : null
    }).eq("id", task.id);
    if (updateError) setError(updateError.message);
    else {
      await supabase.from("task_activity").insert({ task_id: task.id, actor_id: userId, action: "status_changed", details: { from: task.status, to: status } });
      setSuccess("Task status updated."); await load();
    }
  }

  const filtered = filter === "all" ? tasks : tasks.filter((task) => task.status === filter);
  const counts = {
    all: tasks.length, todo: tasks.filter(t => t.status === "todo").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    review: tasks.filter(t => t.status === "review").length,
    completed: tasks.filter(t => t.status === "completed").length
  };
  const personName = (id: string | null) => people.find(p => p.id === id)?.full_name || (id === userId ? "You" : "Unassigned");

  return <section className="tasks-workspace">
    <div className="tasks-toolbar">
      <div><h2>Tasks & Projects</h2><p>Assign work, follow progress and review completion.</p></div>
      <div className="tasks-actions"><button className="secondary-action" onClick={() => void load()}><RefreshCw size={15}/> Refresh</button>{canAssign && <button className="primary-action" onClick={() => setShowForm(v => !v)}><Plus size={16}/> New task</button>}</div>
    </div>
    <div className="task-metrics">
      {(["all","todo","in_progress","review","completed"] as const).map(key => <button key={key} onClick={() => setFilter(key)} className={filter === key ? "task-filter active" : "task-filter"}><span>{key === "all" ? "All tasks" : statusLabels[key]}</span><b>{counts[key]}</b></button>)}
    </div>
    {error && <p className="task-alert error">{error}</p>}{success && <p className="task-alert success">{success}</p>}
    {showForm && canAssign && <form className="task-form" onSubmit={createTask}>
      <div className="task-form-heading"><b>Create a task</b><button type="button" onClick={() => setShowForm(false)}>Close</button></div>
      <label>Task title<input name="title" required placeholder="e.g. Prepare 4 Instagram creatives"/></label>
      <label>Description<textarea name="description" rows={3} placeholder="Brief, requirements and deliverables"/></label>
      <div className="task-form-grid">
        <label>Assign to<select name="assigned_to" defaultValue=""><option value="">Unassigned</option>{people.map(p => <option key={p.id} value={p.id}>{p.full_name || p.role}</option>)}</select></label>
        <label>Priority<select name="priority" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
        <label>Due date<input name="due_date" type="date"/></label>
        <label>Client<input name="client_name" placeholder="Client name"/></label>
        <label>Project<input name="project_name" placeholder="Project / campaign"/></label>
        <label>Category<input name="category" placeholder="Design, Ads, SEO..."/></label>
      </div>
      <button className="primary-action" type="submit" disabled={saving}>{saving ? <Loader2 className="spin" size={16}/> : <Plus size={16}/>} {saving ? "Saving..." : "Create task"}</button>
    </form>}
    {loading ? <div className="task-empty"><Loader2 className="spin" size={22}/> Loading tasks…</div> : filtered.length === 0 ? <div className="task-empty"><CircleCheck size={28}/><b>No tasks here yet</b><span>Create a task to start tracking agency work.</span></div> :
      <div className="task-list">{filtered.map(task => <article className="task-row" key={task.id}>
        <div className="task-main"><div className="task-title-line"><b>{task.title}</b><span className={"priority priority-"+task.priority}>{priorityLabels[task.priority]}</span></div>
          {task.description && <p>{task.description}</p>}
          <div className="task-meta">{task.client_name && <span>{task.client_name}</span>}{task.project_name && <span>{task.project_name}</span>}<span><UserRound size={13}/> {personName(task.assigned_to)}</span>{task.due_date && <span><CalendarClock size={13}/> {new Date(task.due_date+"T00:00:00").toLocaleDateString("en-IN")}</span>}</div>
        </div>
        <select aria-label={"Update status for "+task.title} value={task.status} onChange={e => void changeStatus(task, e.target.value as Task["status"])}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="review">Review</option><option value="completed">Completed</option><option value="blocked">Blocked</option></select>
      </article>)}</div>}
  </section>;
}
