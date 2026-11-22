"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileBarChart2, Loader2, Printer, RefreshCw } from "lucide-react";

type Client = { id: string; name: string };
type Report = { id: string; client_id: string | null; report_date: string; platform: string; campaign_name: string | null; spend: number; impressions: number; clicks: number; leads: number; sales_count: number; sales_value: number; notes: string | null };
const money = (v: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v || 0));
const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);

export default function ReportsPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [clients, setClients] = useState<Client[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [clientId, setClientId] = useState("");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    const [c, r] = await Promise.all([
      supabase.from("clients").select("id,name").order("name"),
      supabase.from("ad_reports").select("*").gte("report_date", from).lte("report_date", to).order("report_date", { ascending: true }).limit(1000)
    ]);
    if (c.error) setError(c.error.message); else setClients((c.data || []) as Client[]);
    if (r.error) setError(r.error.message); else setReports((r.data || []) as Report[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  const filtered = reports.filter(r => !clientId || r.client_id === clientId);
  const spend = filtered.reduce((s, r) => s + Number(r.spend), 0);
  const sales = filtered.reduce((s, r) => s + Number(r.sales_value), 0);
  const leads = filtered.reduce((s, r) => s + Number(r.leads), 0);
  const impressions = filtered.reduce((s, r) => s + Number(r.impressions), 0);
  const clicks = filtered.reduce((s, r) => s + Number(r.clicks), 0);
  const clientName = clients.find(c => c.id === clientId)?.name || "All clients";
  const roas = spend > 0 ? sales / spend : 0;
  return <section className="reports-workspace">
    <div className="tasks-toolbar"><div><h2>Reports & Documents</h2><p>Build a client performance summary from recorded campaign reports.</p></div><div className="tasks-actions"><button className="secondary-action" onClick={() => void load()}><RefreshCw size={15}/> Refresh</button><button className="primary-action" onClick={() => window.print()} disabled={!filtered.length}><Printer size={15}/> Print / Save PDF</button></div></div>
    <div className="task-form"><div className="task-form-grid">
      <label>Client<select value={clientId} onChange={e => setClientId(e.target.value)}><option value="">All clients</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>From<input type="date" value={from} onChange={e => setFrom(e.target.value)}/></label>
      <label>To<input type="date" value={to} onChange={e => setTo(e.target.value)}/></label>
      <button className="secondary-action" onClick={() => void load()} type="button">Apply period</button>
    </div></div>
    {error && <p className="task-alert error">{error}</p>}
    {loading ? <div className="task-empty"><Loader2 className="spin" size={22}/> Loading report data…</div> : <div id="client-report-print">
      <div className="panel-head"><div><h3>{clientName} — Performance Report</h3><p>{from} to {to} · Prepared from manually entered ad report data</p></div><FileBarChart2 size={22}/></div>
      <div className="ads-kpis"><article><span>Ad spend</span><b>{money(spend)}</b></article><article><span>Leads</span><b>{leads}</b></article><article><span>Cost per lead</span><b>{money(leads ? spend / leads : 0)}</b></article><article><span>ROAS</span><b>{roas.toFixed(2)}x</b></article></div>
      <div className="ads-kpis"><article><span>Impressions</span><b>{impressions.toLocaleString("en-IN")}</b></article><article><span>Clicks</span><b>{clicks.toLocaleString("en-IN")}</b></article><article><span>Sales</span><b>{filtered.reduce((s,r)=>s+Number(r.sales_count),0)}</b></article><article><span>Sales value</span><b>{money(sales)}</b></article></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Date</th><th>Client</th><th>Platform</th><th>Campaign</th><th>Spend</th><th>Leads</th><th>Sales value</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td>{r.report_date}</td><td>{clients.find(c=>c.id===r.client_id)?.name || "—"}</td><td>{r.platform}</td><td>{r.campaign_name || "—"}</td><td>{money(Number(r.spend))}</td><td>{r.leads}</td><td>{money(Number(r.sales_value))}</td></tr>)}</tbody></table></div>
      {!filtered.length && <div className="task-empty">No ad report entries found for this client and date range.</div>}
      <p className="content-footnote">ROAS = recorded sales value ÷ recorded ad spend. Results depend on the accuracy and completeness of manually entered campaign data. This report does not fetch live Meta or Google Ads data.</p>
    </div>}
    <style jsx global>{`@media print { body * { visibility: hidden !important; } #client-report-print, #client-report-print * { visibility: visible !important; } #client-report-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; background: white; color: #111; } .tasks-toolbar, .task-form, .sidebar, .topbar, .welcome, .mobile-tabbar { display: none !important; } }`}</style>
  </section>;
}
