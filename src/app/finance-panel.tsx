"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, CircleDollarSign, FileText, Loader2, Plus, RefreshCw, Wallet, ExternalLink } from "lucide-react";

type Expense={id:string;created_by:string|null;expense_date:string;category:string;description:string|null;amount:number;payment_method:string|null;receipt_url:string|null;approval_status:string;payment_status:string;paid_amount:number;created_at:string};
type Person={id:string;full_name:string;role:string;hourly_rate:number};
type Payroll={id:string;user_id:string;month:string;base_salary:number;hourly_rate:number;hours_worked:number;hourly_earnings:number;allowances:number;deductions:number;advance:number;bonus:number;paid_amount:number;payment_date:string|null;payment_status:string;notes:string|null};
const financeRoles=["ceo","operations_manager","accounts"];
const money=(v:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(v||0));
const todayIndia=()=>{const p=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const v=(k:string)=>p.find(x=>x.type===k)?.value||"";return v("year")+"-"+v("month")+"-"+v("day")};
const monthNow=()=>todayIndia().slice(0,7)+"-01";
export default function FinancePanel({role,userId}:{role:string;userId:string}){
 const supabase=useMemo(()=>createClient(),[]);
 const canViewPayroll=financeRoles.includes(role);
 const [expenses,setExpenses]=useState<Expense[]>([]),[payroll,setPayroll]=useState<Payroll[]>([]),[people,setPeople]=useState<Person[]>([]);
 const [tab,setTab]=useState<"expenses"|"payroll">("expenses"),[expenseMonth,setExpenseMonth]=useState(monthNow()),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [showExpense,setShowExpense]=useState(false),[showPayroll,setShowPayroll]=useState(false);
 const [zohoStatus,setZohoStatus]=useState<{configured:boolean;connected:boolean;organization?:string;setupMissing?:boolean;error?:string}|null>(null);
 useEffect(()=>{fetch("/api/zoho/status",{cache:"no-store"}).then(r=>r.json()).then(setZohoStatus).catch(()=>setZohoStatus({configured:false,connected:false,error:"Could not check Zoho connection."}));},[]);
 const [category,setCategory]=useState("Office"),[amount,setAmount]=useState(""),[expenseDate,setExpenseDate]=useState(todayIndia()),[description,setDescription]=useState(""),[paymentMethod,setPaymentMethod]=useState("Bank transfer"),[receipt,setReceipt]=useState<File|null>(null);
 const [personId,setPersonId]=useState(""),[month,setMonth]=useState(monthNow()),[base,setBase]=useState(""),[allowances,setAllowances]=useState("0"),[bonus,setBonus]=useState("0"),[deductions,setDeductions]=useState("0"),[advance,setAdvance]=useState("0"),[notes,setNotes]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  const e=await supabase.from("expenses").select("*").order("expense_date",{ascending:false}).limit(300);
  if(e.error)setError(e.error.message);else setExpenses((e.data||[]) as Expense[]);
  if(canViewPayroll){
   const [p,staff]=await Promise.all([supabase.from("payroll").select("*").order("month",{ascending:false}).limit(500),(supabase as any).from("profiles").select("id,full_name,role,hourly_rate").eq("is_active",true).order("full_name")]);
   if(p.error)setError(p.error.message);else setPayroll((p.data||[]) as unknown as Payroll[]);
   if(staff.error)setError(staff.error.message);else setPeople((staff.data||[]) as Person[]);
  }
  setLoading(false);
 },[supabase,canViewPayroll]);
 useEffect(()=>{void load()},[load]);
 const monthlyExpenses=expenses.filter(x=>x.expense_date.startsWith(expenseMonth.slice(0,7)));
 const totalExpenses=monthlyExpenses.filter(x=>x.approval_status==="approved").reduce((s,x)=>s+Number(x.amount),0);
 const pendingExpenses=monthlyExpenses.filter(x=>x.approval_status==="pending").reduce((s,x)=>s+Number(x.amount),0);
 const payrollDue=payroll.filter(x=>x.payment_status!=="paid").reduce((s,x)=>s+Math.max(0,Number(x.hourly_earnings||0)+Number(x.allowances)+Number(x.bonus)-Number(x.deductions)-Number(x.advance)-Number(x.paid_amount)),0);
 const resetExpense=()=>{setAmount("");setDescription("");setReceipt(null);setShowExpense(false)};
 async function submitExpense(ev:FormEvent){
  ev.preventDefault();setSaving(true);setError("");setSuccess("");
  try{
   let receiptPath:string|null=null;
   if(receipt){
    const ext=receipt.name.split(".").pop()?.toLowerCase()||"jpg";
    receiptPath=userId+"/"+crypto.randomUUID()+"."+ext;
    const up=await supabase.storage.from("expense-receipts").upload(receiptPath,receipt,{contentType:receipt.type,upsert:false});
    if(up.error)throw up.error;
   }
   const {error:e}=await supabase.from("expenses").insert({created_by:userId,expense_date:expenseDate,category,description:description||null,amount:Number(amount),payment_method:paymentMethod,receipt_url:receiptPath,approval_status:"pending"});
   if(e)throw e;setSuccess("Expense submitted for review.");resetExpense();await load();
  }catch(e){setError(e instanceof Error?e.message:"Could not save expense.");}finally{setSaving(false)}
 }
 async function submitPayroll(ev:FormEvent){
  ev.preventDefault();if(!personId){setError("Select a staff member.");return}
  setSaving(true);setError("");setSuccess("");
  const person=people.find(p=>p.id===personId);
  if(!person){setError("Selected staff profile was not found.");setSaving(false);return;}
  const start=month+"-01";const [yy,mm]=month.split("-").map(Number);const end=new Date(Date.UTC(yy,mm,1)).toISOString().slice(0,10);
  const sessions=await (supabase as any).from("attendance_sessions").select("check_in,check_out").eq("user_id",personId).gte("attendance_date",start).lt("attendance_date",end).not("check_out","is",null);
  if(sessions.error){setError(sessions.error.message);setSaving(false);return;}
  const totalHours=((sessions.data||[]) as {check_in:string;check_out:string|null}[]).reduce((sum:number,row:{check_in:string;check_out:string|null})=>sum+Math.max(0,(new Date(row.check_out!).getTime()-new Date(row.check_in).getTime())/3600000),0);
  const rate=Number(person.hourly_rate||0);const earnings=Math.round(totalHours*rate*100)/100;
  const {error:e}=await (supabase as any).from("payroll").insert({user_id:personId,month:start,base_salary:0,hourly_rate:rate,hours_worked:Math.round(totalHours*100)/100,hourly_earnings:earnings,allowances:Number(allowances),bonus:Number(bonus),deductions:Number(deductions),advance:Number(advance),paid_amount:0,payment_status:"pending",notes:notes||null});
  if(e)setError(e.message);else{setSuccess("Payroll record created.");setShowPayroll(false);setBase("");setNotes("");await load()}setSaving(false);
 }
 async function reviewExpense(item:Expense,status:"approved"|"rejected"){
  const {error:e}=await supabase.from("expenses").update({approval_status:status}).eq("id",item.id);
  if(e)setError(e.message);else{setSuccess("Expense status updated.");await load()}
 }
 async function markExpensePaid(item:Expense){
  const {error:e}=await (supabase as any).from("expenses").update({payment_status:"paid",paid_amount:item.amount,paid_at:new Date().toISOString()}).eq("id",item.id);
  if(e)setError(e.message);else{setSuccess("Expense payment recorded.");await load()}
 }
 async function markPaid(item:Payroll){
  const {error:e}=await supabase.from("payroll").update({payment_status:"paid",paid_amount:Math.max(0,Number(item.hourly_earnings||0)+Number(item.allowances)+Number(item.bonus)-Number(item.deductions)-Number(item.advance)),payment_date:todayIndia()}).eq("id",item.id);
  if(e)setError(e.message);else{setSuccess("Payroll marked as paid.");await load()}
 }
 async function openReceipt(path:string){
  const {data,error:e}=await supabase.storage.from("expense-receipts").createSignedUrl(path,60);
  if(e)setError(e.message);else if(data?.signedUrl)window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }
 const personName=(id:string)=>people.find(p=>p.id===id)?.full_name||"Staff member";
 return <div className="finance-workspace">
  <section className="finance-list" style={{padding:18,marginBottom:16,border:"1px solid var(--border)"}}>
   <div className="panel-head"><div><h3>Zoho Books</h3><p>Connect your accounting workspace to bring reports into SDMA Office OS.</p></div><ExternalLink size={18}/></div>
   {zohoStatus===null?<p>Checking connection…</p>:zohoStatus.connected?<div className="finance-alert success">Connected to {zohoStatus.organization||"Zoho Books"} · Reports integration phase is next.</div>:<div><div className="finance-alert">{zohoStatus.setupMissing||!zohoStatus.configured?"Zoho OAuth setup is pending. Add the OAuth environment variables in Vercel before connecting.":"Zoho Books is not connected yet."}</div><button className="primary-action" disabled={!zohoStatus.configured||zohoStatus.setupMissing} onClick={()=>window.location.assign("/api/zoho/connect")}>Connect Zoho Books</button></div>}
  </section>
  <div className="finance-kpis">
   <article><span>Approved expenses</span><b>{money(totalExpenses)}</b><small>Selected month</small></article>
   <article><span>Pending expenses</span><b>{money(pendingExpenses)}</b><small>Selected month</small></article>
   {canViewPayroll&&<article><span>Unpaid payroll balance</span><b>{money(payrollDue)}</b><small>Based on entered payroll records</small></article>}
  </div>
  <div className="finance-toolbar"><div className="finance-tabs"><button className={tab==="expenses"?"active":""} onClick={()=>setTab("expenses")}><Wallet size={15}/> Expenses</button>{canViewPayroll&&<button className={tab==="payroll"?"active":""} onClick={()=>setTab("payroll")}><CircleDollarSign size={15}/> Payroll</button>}</div><button className="primary-action" onClick={()=>tab==="expenses"?setShowExpense(!showExpense):setShowPayroll(!showPayroll)}><Plus size={15}/>{tab==="expenses"?"Add expense":"Add payroll"}</button></div>
  {error&&<div className="finance-alert error">{error}</div>}{success&&<div className="finance-alert success">{success}</div>}
  {showExpense&&<form className="task-form" onSubmit={submitExpense}><div className="task-form-heading"><b>New expense submission</b><button type="button" onClick={()=>setShowExpense(false)}>Close</button></div>
   <div className="task-form-grid"><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{["Office","Rent","Utilities","Internet","Travel","Food","Marketing","Software","Equipment","Salary","Other"].map(v=><option key={v}>{v}</option>)}</select></label><label>Amount (₹)<input required type="number" min="1" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></label><label>Date<input required type="date" value={expenseDate} onChange={e=>setExpenseDate(e.target.value)}/></label><label>Payment method<select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}>{["Bank transfer","UPI","Cash","Card","Other"].map(v=><option key={v}>{v}</option>)}</select></label><label>Description<input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Vendor or purpose"/></label><label>Receipt (optional)<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>setReceipt(e.target.files?.[0]||null)}/></label></div>
   <p className="content-footnote">Receipt files are stored in a private bucket. Submissions remain pending until reviewed by Finance.</p><button className="primary-action" disabled={saving||!amount}>{saving?<Loader2 className="spin" size={15}/>:<Check size={15}/>}Submit expense</button>
  </form>}
  {showPayroll&&canViewPayroll&&<form className="task-form" onSubmit={submitPayroll}><div className="task-form-heading"><b>Create payroll record</b><button type="button" onClick={()=>setShowPayroll(false)}>Close</button></div>
   <div className="task-form-grid"><label>Staff member<select required value={personId} onChange={e=>setPersonId(e.target.value)}><option value="">Select staff</option>{people.map(p=><option key={p.id} value={p.id}>{p.full_name} · {p.role.replaceAll("_"," ")}</option>)}</select></label><label>Salary month<input required type="month" value={month.slice(0,7)} onChange={e=>setMonth(e.target.value+"-01")}/></label><label>Fixed hourly rate<input readOnly value={money(Number(people.find(p=>p.id===personId)?.hourly_rate||0))+" / hour"}/></label><label>Allowances (₹)<input type="number" min="0" value={allowances} onChange={e=>setAllowances(e.target.value)}/></label><label>Bonus / incentive (₹)<input type="number" min="0" value={bonus} onChange={e=>setBonus(e.target.value)}/></label><label>Deductions (₹)<input type="number" min="0" value={deductions} onChange={e=>setDeductions(e.target.value)}/></label><label>Advance (₹)<input type="number" min="0" value={advance} onChange={e=>setAdvance(e.target.value)}/></label><label>Notes<input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional"/></label></div>
   <p className="content-footnote">Hourly earnings = verified completed attendance session hours × staff hourly rate. Net payable = hourly earnings + allowances + bonus − deductions − advance. Payroll is visible only to CEO, Operations Manager and Accounts.</p><button className="primary-action" disabled={saving||!personId}>{saving?<Loader2 className="spin" size={15}/>:<Check size={15}/>}Save payroll</button>
  </form>}
  {loading?<div className="task-empty"><Loader2 className="spin" size={22}/>Loading finance records…</div>:tab==="expenses"?<section className="finance-list"><div className="panel-head"><div><h3>Expense register</h3><p>Submitted expenses and approval status</p></div><input aria-label="Expense month" type="month" value={expenseMonth.slice(0,7)} onChange={e=>setExpenseMonth(e.target.value+"-01")}/><button className="secondary-action" onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button></div>
   {!expenses.length?<div className="task-empty"><FileText size={25}/><b>No expenses yet</b><span>Use Add expense to submit the first record.</span></div>:expenses.map(item=><article className="finance-row" key={item.id}><div className="finance-row-main"><b>{item.category} · {money(Number(item.amount))}</b><small>{item.expense_date} · {item.payment_method||"Payment method not set"}</small>{item.description&&<p>{item.description}</p>}</div><span className={"finance-status "+item.approval_status}>{item.approval_status}</span><div className="finance-row-actions">{item.receipt_url&&<button className="secondary-action" onClick={()=>void openReceipt(item.receipt_url!)}>Receipt</button>}{canViewPayroll&&item.approval_status==="pending"&&<><button className="secondary-action" onClick={()=>void reviewExpense(item,"approved")}>Approve</button><button className="secondary-action" onClick={()=>void reviewExpense(item,"rejected")}>Reject</button></>}</div></article>)}
  </section>:<section className="finance-list"><div className="panel-head"><div><h3>Monthly payroll</h3><p>Salary records and payment tracking</p></div><button className="secondary-action" onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button></div>
   {!payroll.length?<div className="task-empty"><CircleDollarSign size={25}/><b>No payroll records</b><span>Create a monthly payroll record for a staff member.</span></div>:payroll.map(item=>{const net=Number(item.hourly_earnings||0)+Number(item.allowances)+Number(item.bonus)-Number(item.deductions)-Number(item.advance);return <article className="finance-row" key={item.id}><div className="finance-row-main"><b>{personName(item.user_id)} · {money(net)}</b><small>{item.month.slice(0,7)} · {Number(item.hours_worked||0).toFixed(2)} hrs × {money(Number(item.hourly_rate||0))}/hr · Bonus {money(Number(item.bonus))}</small>{item.notes&&<p>{item.notes}</p>}</div><span className={"finance-status "+item.payment_status}>{item.payment_status}</span>{item.payment_status!=="paid"&&<div className="finance-row-actions"><button className="secondary-action" onClick={()=>void markPaid(item)}>Mark paid</button></div>}</article>})}
  </section>}
  <p className="content-footnote">Finance figures reflect records entered in SDMA Office OS; no bank, accounting or payroll provider is connected.</p>
 </div>;
}
