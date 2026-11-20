"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Activity, Users, Clock3, CheckCircle2, AlertTriangle, Megaphone, Wallet, RefreshCw, TrendingUp } from "lucide-react";

type Row = Record<string, any>;
const financeRoles = ["ceo", "operations_manager", "accounts"];
const managerRoles = ["ceo", "operations_manager", "team_lead", "office_admin"];
const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const monthStart = () => todayKey().slice(0, 7) + "-01";
const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export default function AgencyOverview({ role, userId }: { role: string; userId: string }) {
  const db = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({ staff: [] as Row[], tasks: [] as Row[], attendance: [] as Row[], content: [] as Row[], ads: [] as Row[], leads: [] as Row[], expenses: [] as Row[] });
  const canManage = managerRoles.includes(role);
  const canFinance = financeRoles.includes(role);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const today = todayKey();
    const taskQuery = db.from("tasks").select("id,title,status,due_date,assigned_to,completed_at,created_at").order("created_at", { ascending: false }).limit(600);
    const attendanceQuery = db.from("attendance").select("id,user_id,attendance_date,check_in,check_out,status").eq("attendance_date", today).limit(300);
    const contentQuery = db.from("content_items").select("id,title,status,assigned_to,due_at").limit(500);
    const [staffRes, taskRes, attendanceRes, contentRes, adsRes, leadsRes, expenseRes] = await Promise.all([
      canManage ? db.from("profiles").select("id,full_name,role,is_active").eq("is_active", true).limit(300) : Promise.resolve({ data: [], error: null } as any),
      taskQuery, attendanceQuery, contentQuery,
      canManage ? db.from("ad_reports").select("id,report_date,spend,leads,sales_value,client_id").gte("report_date", monthStart()).limit(1000) : Promise.resolve({ data: [], error: null } as any),
      canManage ? db.from("leads").select("id,status,created_at,assigned_to").gte("created_at", monthStart()).limit(1000) : Promise.resolve({ data: [], error: null } as any),
      canFinance ? db.from("expenses").select("id,amount,expense_date,approval_status").gte("expense_date", monthStart()).limit(1000) : Promise.resolve({ data: [], error: null } as any)
    ]);
    const firstError = [taskRes, attendanceRes, contentRes].find(x => x.error)?.error;
    if (firstError) setError(firstError.message);
    setData({
      staff: (staffRes.data || []) as Row[], tasks: (taskRes.data || []) as Row[],
      attendance: (attendanceRes.data || []) as Row[], content: (contentRes.data || []) as Row[],
      ads: (adsRes.data || []) as Row[], leads: (leadsRes.data || []) as Row[],
      expenses: (expenseRes.data || []) as Row[]
    });
    setLoading(false);
  }, [db, canManage, canFinance]);

  useEffect(() => { void load(); }, [load]);

  const tasks = data.tasks;
  const completed = tasks.filter(x => x.status === "completed").length;
  const pending = tasks.filter(x => x.status !== "completed").length;
  const overdue = tasks.filter(x => x.status !== "completed" && x.due_date && x.due_date < todayKey()).length;
  const present = data.attendance.length;
  const awaiting = data.content.filter(x => ["needs_review", "review"].includes(String(x.status).toLowerCase())).length;
  const spend = data.ads.reduce((s, x) => s + Number(x.spend || 0), 0);
  const adLeads = data.ads.reduce((s, x) => s + Number(x.leads || 0), 0);
  const sales = data.ads.reduce((s, x) => s + Number(x.sales_value || 0), 0);
  const cpl = adLeads ? spend / adLeads : 0;
  const roas = spend ? sales / spend : 0;
  const approvedExpenses = data.expenses.filter(x => x.approval_status === "approved").reduce((s, x) => s + Number(x.amount || 0), 0);
  const pendingExpenses = data.expenses.filter(x => x.approval_status === "pending").reduce((s, x) => s + Number(x.amount || 0), 0);

  const staffRows = data.staff.map(person => {
    const assigned = tasks.filter(t => t.assigned_to === person.id);
    const done = assigned.filter(t => t.status === "completed").length;
    return { ...person, total: assigned.length, done, rate: assigned.length ? Math.round(done / assigned.length * 100) : 0 };
  }).sort((a, b) => b.total - a.total).slice(0, 8);

  const cards = [
    { label: canManage ? "Active team members" : "My open tasks", value: canManage ? data.staff.length : tasks.filter(t => t.assigned_to === userId && t.status !== "completed").length, note: canManage ? "Active staff profiles" : "Assigned to your account", Icon: Users },
    { label: "Today's attendance", value: present, note: "Check-ins recorded today", Icon: Clock3 },
    { label: "Tasks completed", value: completed, note: "From visible task records", Icon: CheckCircle2 },
    { label: "Overdue tasks", value: overdue, note: "Past due and not completed", Icon: AlertTriangle }
  ];

  return <div className="agency-overview">
    <div className="agency-overview-head"><div><h2>Agency performance</h2><p>Live operational snapshot · {todayKey()}</p></div><button className="secondary-action" onClick={() => void load()}><RefreshCw size={14}/> Refresh data</button></div>
    {error && <div className="task-alert error">{error} Some figures may be unavailable under your role permissions.</div>}
    <div className="agency-kpis">{cards.map(({ label, value, note, Icon }) => <article className="agency-kpi" key={label}><div><span>{label}</span><Icon size={18}/></div><b>{loading ? "—" : value}</b><small>{note}</small></article>)}</div>
    <div className="agency-analytics-grid">
      <section className="panel"><div className="panel-head"><div><h3>Task health</h3><p>Current visible task workload</p></div><Activity size={18}/></div>
        <div className="agency-progress-list"><div><span>Completed</span><b>{completed}</b></div><div className="agency-track"><i style={{width: (completed + pending ? completed / (completed + pending) * 100 : 0) + "%"}}/></div><div><span>Open / in progress</span><b>{pending}</b></div><div className="agency-track"><i className="open" style={{width: (completed + pending ? pending / (completed + pending) * 100 : 0) + "%"}}/></div><div className="agency-inline-stats"><span>Overdue <b>{overdue}</b></span><span>Awaiting creative review <b>{awaiting}</b></span></div></div>
      </section>
      <section className="panel"><div className="panel-head"><div><h3>Ads performance · This month</h3><p>Based on manually entered ad report snapshots</p></div><Megaphone size={18}/></div>
        {canManage ? <div className="agency-ad-metrics"><article><small>Ad spend</small><b>{money(spend)}</b></article><article><small>Leads</small><b>{adLeads}</b></article><article><small>Cost per lead</small><b>{money(cpl)}</b></article><article><small>ROAS</small><b>{roas.toFixed(2)}x</b></article></div> : <p className="content-footnote">Ads analytics are available to management roles.</p>}
      </section>
      {canManage && <section className="panel"><div className="panel-head"><div><h3>Staff task performance</h3><p>Completed tasks compared with assigned tasks</p></div><Users size={18}/></div>
        {staffRows.length ? <div className="agency-staff-list">{staffRows.map(person => <div className="agency-staff-row" key={person.id}><div><b>{person.full_name || "Team member"}</b><small>{person.role?.replaceAll("_", " ")} · {person.done}/{person.total} completed</small></div><strong>{person.rate}%</strong><div className="agency-track"><i style={{width: person.rate + "%"}}/></div></div>)}</div> : <p className="content-footnote">Staff performance appears when profiles and tasks are visible.</p>}
      </section>}
      {canFinance && <section className="panel"><div className="panel-head"><div><h3>Finance snapshot · This month</h3><p>Expense records only; payroll is not included here</p></div><Wallet size={18}/></div><div className="agency-ad-metrics"><article><small>Approved expenses</small><b>{money(approvedExpenses)}</b></article><article><small>Pending approval</small><b>{money(pendingExpenses)}</b></article></div></section>}
      {canManage && <section className="panel"><div className="panel-head"><div><h3>Lead pipeline · This month</h3><p>Lead records accessible to management</p></div><TrendingUp size={18}/></div><div className="agency-lead-stats">{["new","contacted","qualified","proposal","won","lost"].map(status => <div key={status}><span>{status}</span><b>{data.leads.filter(x => String(x.status).toLowerCase() === status).length}</b></div>)}</div></section>}
    </div>
    <p className="content-footnote">Metrics follow Supabase role permissions and only include records visible to your account. Ad metrics are manual snapshots, not a live Meta or Google Ads API connection. Client revenue and payroll totals are not inferred.</p>
  </div>;
}
