"use client";

import { useState } from "react";
import TasksPanel from "./tasks-panel";
import StaffPanel from "./staff-panel";
import AttendancePanel from "./attendance-panel";
import ClientsPanel from "./clients-panel";
import DailyReportsPanel from "./daily-reports-panel";
import LeavePanel from "./leave-panel";
import ContentCalendarPanel from "./content-calendar-panel";
import AdsLeadsPanel from "./ads-leads-panel";
import FinancePanel from "./finance-panel";
import { visibleModules, type SdmaRole } from "@/lib/auth/roles";
import {
  Activity, Bell, CalendarDays, CheckCircle2, ChevronDown, CircleHelp,
  ClipboardList, Clock3, FileBarChart2, LayoutDashboard, Menu, MessageSquareText,
  Search, Settings, ShieldCheck, Users, Wallet, X, FolderKanban, Megaphone
} from "lucide-react";

const nav = [
  ["Overview", LayoutDashboard], ["Tasks & Projects", ClipboardList],
  ["Clients & CRM", Users], ["Content Calendar", CalendarDays],
  ["Ads & Leads", Megaphone], ["Attendance", Clock3],
  ["Daily Reports", FileBarChart2], ["Leave Management", CalendarDays], ["Team & Roles", ShieldCheck],
  ["Finance & Payroll", Wallet], ["Announcements", MessageSquareText]
] as const;

const modules = [
  ["Tasks & Projects", "Assign, track and review work", ClipboardList, "red"],
  ["Clients & CRM", "Accounts, services and projects", Users, "blue"],
  ["Content Calendar", "Plan, approve and publish content", CalendarDays, "purple"],
  ["Ads & Leads", "Campaign performance and lead flow", Megaphone, "orange"],
  ["Attendance", "Selfie, GPS and work hours", Clock3, "green"],
  ["Daily Reports", "Morning and evening updates", FileBarChart2, "slate"],
  ["Leave Management", "Apply and review leave requests", CalendarDays, "green"],
  ["Team & Roles", "Staff profiles and access levels", ShieldCheck, "blue"]
] as const;

export default function Dashboard({ fullName, role, userId }: { fullName: string; role: string; userId: string }) {
  const [active, setActive] = useState("Overview");
  const visibleNav = nav.filter(([label]) => visibleModules(role as SdmaRole).includes(label));
  const roleLabel = role === "ceo" ? "CEO & Founder" : role === "operations_manager" ? "Operations Manager" : role === "team_lead" ? "Team Leader" : role.replaceAll("_", " ");
  const [open, setOpen] = useState(false);

  return <main className="shell">
    <aside className={open ? "sidebar open" : "sidebar"}>
      <div className="brand"><div className="brand-mark">S</div><div><b>SHAH<span>.</span></b><small>OFFICE OS</small></div><button className="close-menu" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="workspace"><span className="workspace-icon">SD</span><div><b>Shah Digital</b><small>Agency workspace</small></div><ChevronDown size={15}/></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{visibleNav.map(([label, Icon]) => <button key={label} onClick={() => {setActive(label);setOpen(false);}} className={active === label ? "nav-item selected" : "nav-item"}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item"><Settings size={18}/>Settings</button><button className="nav-item"><CircleHelp size={18}/>Help & Support</button><div className="user-chip"><div className="avatar">SP</div><div><b>{fullName}</b><small>{roleLabel}</small></div><ChevronDown size={15}/></div></div>
    </aside>
    {open && <button className="scrim" onClick={() => setOpen(false)} aria-label="Close navigation"/>}
    <section className="main">
      <header className="topbar"><div className="crumb"><button className="menu-button" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20}/></button>Workspace <span>/</span> <b>{active}</b></div><div className="top-actions"><label className="search"><Search size={16}/><input placeholder="Search anything..."/></label><button className="icon-btn" aria-label="Notifications"><Bell size={19}/><i/></button><div className="top-avatar">SP</div></div></header>
      <div className="page">
        <div className="welcome"><div><div className="eyebrow">SHAH DIGITAL MARKETING AGENCY</div><h1>Good morning, {fullName.split(" ")[0]} <span>✦</span></h1><p>Your agency operations, all in one place.</p></div><div className="date-pill">{new Date().toLocaleDateString("en-IN",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})}</div></div>
        {active === "Tasks & Projects" ? <TasksPanel role={role} userId={userId} />
          : active === "Team & Roles" ? <StaffPanel role={role} userId={userId} />
          : active === "Attendance" ? <AttendancePanel userId={userId} role={role} />
          : active === "Clients & CRM" ? <ClientsPanel role={role} />
          : active === "Daily Reports" ? <DailyReportsPanel userId={userId} role={role} />
          : active === "Leave Management" ? <LeavePanel userId={userId} role={role} />
          : active === "Content Calendar" ? <ContentCalendarPanel role={role} userId={userId} />
          : active === "Ads & Leads" ? <AdsLeadsPanel role={role} userId={userId} />
          : active === "Finance & Payroll" ? <FinancePanel role={role} userId={userId} />
          : active === "Overview" ? <>
            <div className="section-head"><div><h2>Agency overview</h2><p>Live metrics will appear after secure data integration.</p></div><button className="period">Today <ChevronDown size={14}/></button></div>
            <div className="stats">
              {[["Team members","—","Waiting for team data",Users,"red"],["Tasks in progress","—","Tasks will sync from workspace",Activity,"blue"],["Pending approvals","—","Creative and task reviews",CheckCircle2,"orange"],["Monthly expenses","—","Finance module not connected",Wallet,"green"]].map(([label,value,foot,Icon,tone]) => <article className="stat" key={String(label)}><div className="stat-top"><span>{String(label)}</span><span className={"stat-icon "+String(tone)}><Icon size={18}/></span></div><strong>{String(value)}</strong><small>{String(foot)}</small></article>)}
            </div>
            <div className="columns">
              <section className="panel"><div className="panel-head"><div><h3>All modules</h3><p>Your agency, in one workspace</p></div><FolderKanban size={18}/></div><div className="module-grid">{modules.filter(([title])=>visibleModules(role as SdmaRole).includes(title)).map(([title,detail,Icon,tone]) => <button key={title} className="module" onClick={() => setActive(title)}><span className={"module-icon "+tone}><Icon size={20}/></span><b>{title}</b><small>{detail}</small></button>)}</div></section>
              <section className="panel schedule"><div className="panel-head"><div><h3>Today at a glance</h3><p>Office hours · 9:30 AM – 5:30 PM</p></div><CalendarDays size={18}/></div><div className="timeline"><div><time>9:30 AM</time><i className="dot red-dot"/><section><b>Office starts</b><small>Team check-in window</small></section></div><div><time>10:30 AM</time><i className="dot blue-dot"/><section><b>Daily ads report</b><small>Client campaign performance update</small></section></div><div><time>5:00 PM</time><i className="dot green-dot"/><section><b>Evening reports</b><small>Task completion and blockers</small></section></div></div><div className="schedule-foot"><Clock3 size={15}/> Schedule can be configured in Office Settings.</div></section>
            </div>
            <footer><ShieldCheck size={15}/> Secure agency workspace <span>•</span> Role-based access enabled.</footer>
          </> : <section className="panel module-coming-soon"><div className="panel-head"><div><h3>{active}</h3><p>This workspace module is planned in the SDMA Office OS rollout.</p></div><ShieldCheck size={18}/></div><p>Access is role-controlled. The module will appear here after its database workflows and approval rules are completed.</p></section>}
      </div>
    </section>
  </main>;
}
