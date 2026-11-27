"use client";
import {useEffect,useState} from "react";
import {RefreshCw,BarChart3,Wallet,TrendingUp,FileText,Download,Link2} from "lucide-react";
type D={connected?:boolean;organization?:string;lastSync?:string;data?:any;error?:string};
const money=(v:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(v||0);
export default function AccountsPanel({role}:{role:string}){
 const [status,setStatus]=useState<D>({}),[loading,setLoading]=useState(false),[period,setPeriod]=useState("month"),[report,setReport]=useState("profitloss"),[error,setError]=useState("");
 async function load(){setLoading(true);setError("");try{const r=await fetch("/api/zoho/accounts?period="+period+"&report="+report,{cache:"no-store"});const d=await r.json();if(!r.ok)throw Error(d.error||"Could not load Zoho Books data");setStatus(d)}catch(e:any){setError(e.message||"Connection error")}finally{setLoading(false)}}
 useEffect(()=>{load()},[period,report]);
 return <div className="accounts-workspace">
 <div className="section-head"><div><h2>Accounts Dashboard</h2><p>Zoho Books financial overview and reports</p></div><button className="primary-action" onClick={()=>load()} disabled={loading}><RefreshCw size={15}/>{loading?"Syncing":"Sync / Refresh"}</button></div>
 {error&&<div className="finance-alert error">{error}</div>}
 {!status.connected?<section className="panel" style={{textAlign:"center",padding:40}}><Link2 size={36}/><h2>Connect Zoho Books</h2><p>Securely connect your Zoho Books organization to load accounting data.</p><a className="primary-action" href="/api/zoho/connect">Connect Zoho Books</a><p className="content-footnote">OAuth tokens are handled server-side and are not exposed in the browser.</p></section>:
 <>
 <div className="finance-toolbar"><select value={period} onChange={e=>setPeriod(e.target.value)}><option value="month">This month</option><option value="year">This year</option><option value="custom">Custom range</option></select><select value={report} onChange={e=>setReport(e.target.value)}><option value="profitloss">Profit & Loss</option><option value="sales">Sales</option><option value="invoices">Invoices</option><option value="payments">Payments Received</option><option value="receivables">Receivables</option><option value="payables">Payables</option><option value="expenses">Expenses</option><option value="cashflow">Cash Flow</option><option value="balance">Balance Sheet</option></select></div>
 <div className="finance-kpis"><article><span>Revenue</span><b>{money(status.data?.revenue)}</b><small>Zoho Books</small></article><article><span>Expenses</span><b>{money(status.data?.expenses)}</b><small>Zoho Books</small></article><article><span>Net Profit</span><b>{money(status.data?.profit)}</b><small>Revenue minus expenses</small></article><article><span>Receivables</span><b>{money(status.data?.receivables)}</b><small>Outstanding invoices</small></article></div>
 <section className="panel"><div className="panel-head"><div><h3>{report.replace(/\b\w/g,x=>x.toUpperCase())} Report</h3><p>{status.organization||"Zoho Books"} · {status.lastSync?("Last sync "+new Date(status.lastSync).toLocaleString()):"Not synced"}</p></div><Download size={18}/></div><div style={{overflowX:"auto"}}><pre style={{whiteSpace:"pre-wrap",fontSize:12}}>{JSON.stringify(status.data?.report||status.data?.items||status.data||{},null,2)}</pre></div></section>
 </>}
 </div>
}
