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
import AcademyPanel from "./academy-panel";
import HrReportsPanel from "./hr-reports-panel";
import AnnouncementsPanel from "./announcements-panel";
import ReportsPanel from "./reports-panel";
import AiEnginePanel from "./ai-engine-panel";
import SettingsPanel from "./settings-panel";
import AgencyOverview from "./agency-overview";
import { visibleModules, type SdmaRole } from "@/lib/auth/roles";
import {
  Bell, CalendarDays, ChevronDown, CircleHelp, GraduationCap,
  ClipboardList, Clock3, FileBarChart2, LayoutDashboard, Menu, MessageSquareText,
  Search, Settings, ShieldCheck, Users, Wallet, X, Megaphone, Sparkles
} from "lucide-react";

const nav = [
  ["Overview", LayoutDashboard], ["Tasks & Projects", ClipboardList],
  ["Clients & CRM", Users], ["Content Calendar", CalendarDays],
  ["Ads & Leads", Megaphone], ["Attendance", Clock3],
  ["Daily Reports", FileBarChart2], ["Leave Management", CalendarDays], ["Team & Roles", ShieldCheck],
  ["Finance & Payroll", Wallet], ["Academy Management", GraduationCap], ["HR Reports", Users], ["Reports & Documents", FileBarChart2], ["AI Engine", Sparkles], ["Announcements", MessageSquareText]
] as const;

const mobilePrimary = ["Overview", "Tasks & Projects", "Attendance", "Content Calendar", "Announcements"] as const;
const greeting = () => { const hour = Number(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(new Date())); return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"; };
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || "").join("") || "SD";

const modules = [
  ["Tasks & Projects", "Assign, track and review work", ClipboardList, "red"],
  ["Clients & CRM", "Accounts, services and projects", Users, "blue"],
  ["Content Calendar", "Plan, approve and publish content", CalendarDays, "purple"],
  ["Ads & Leads", "Campaign performance and lead flow", Megaphone, "orange"],
  ["Finance & Payroll", "Expenses, approvals and salary records", Wallet, "green"],
  ["Academy Management", "Students, admissions, batches and fee collection", GraduationCap, "blue"],
  ["HR Reports", "Staff activity, hours and performance", Users, "slate"],
  ["Reports & Documents", "Client performance summaries and PDF export", FileBarChart2, "slate"],
  ["AI Engine", "Gemini-powered agency assistant", Sparkles, "purple"],
  ["Attendance", "Selfie, GPS and work hours", Clock3, "green"],
  ["Daily Reports", "Morning and evening updates", FileBarChart2, "slate"],
  ["Leave Management", "Apply and review leave requests", CalendarDays, "green"],
  ["Team & Roles", "Staff profiles and access levels", ShieldCheck, "blue"]
] as const;

export default function Dashboard({ fullName, role, userId }: { fullName: string; role: string; userId: string }) {
  const [active, setActive] = useState("Overview");
  const [notificationFocus, setNotificationFocus] = useState(false);
  const visibleNav = nav.filter(([label]) => visibleModules(role as SdmaRole).includes(label));
  const roleLabel = role === "ceo" ? "CEO & Founder" : role === "operations_manager" ? "Operations Manager" : role === "team_lead" ? "Team Leader" : role.replaceAll("_", " ");
  const [open, setOpen] = useState(false);

  return <main className="shell">
    <aside className={open ? "sidebar open" : "sidebar"}>
      <div className="brand"><svg viewBox="0 0 1200 430" role="img" aria-label="Shah Digital Marketing Agency" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="430" rx="8" fill="#050505"/><g fontFamily="Arial, Helvetica, sans-serif" fontWeight="900"><text x="35" y="220" fontSize="250" letterSpacing="-15" fill="#fff">SHAH</text><circle cx="1120" cy="105" r="42" fill="#e31e24"/><text x="40" y="300" fontSize="66" letterSpacing="21" fill="#fff">DIGITAL MARKETING</text><path d="M40 365H145 M1055 365H1160" stroke="#e31e24" strokeWidth="8"/><text x="175" y="390" fontSize="60" letterSpacing="3" fill="#e31e24">AGENCY &amp; ACADEMY</text></g></svg><button className="close-menu" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="workspace"><span className="workspace-icon">SD</span><div><b>Shah Digital</b><small>Agency workspace</small></div><ChevronDown size={15}/></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{visibleNav.map(([label, Icon]) => <button key={label} onClick={() => {setActive(label);setOpen(false);if(label === "Announcements") setNotificationFocus(false);}} className={active === label ? "nav-item selected" : "nav-item"}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><button className={active === "Settings" ? "nav-item selected" : "nav-item"} onClick={() => {setActive("Settings");setOpen(false);}}><Settings size={18}/>Settings</button><button className={active === "Help & Support" ? "nav-item selected" : "nav-item"} onClick={() => {setActive("Help & Support");setOpen(false);}}><CircleHelp size={18}/>Help & Support</button><div className="user-chip"><div className="avatar">{initials(fullName)}</div><div><b>{fullName}</b><small>{roleLabel}</small></div><ChevronDown size={15}/></div></div>
    </aside>
    {open && <button className="scrim" onClick={() => setOpen(false)} aria-label="Close navigation"/>}
    <section className="main">
      <header className="topbar"><div className="crumb"><button className="menu-button" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20}/></button>Workspace <span>/</span> <b>{active}</b></div><div className="top-actions"><label className="search"><Search size={16}/><input placeholder="Search anything..."/></label><button className="icon-btn" aria-label="Notifications" onClick={() => {setActive("Announcements");setNotificationFocus(true);}}><Bell size={19}/><i/></button><div className="top-avatar">{initials(fullName)}</div></div></header>
      <div className="page">
        <div className="welcome"><div><div className="eyebrow">SHAH DIGITAL MARKETING AGENCY</div><h1>{greeting()}, {fullName.split(" ")[0]} <span>✦</span></h1><p>Your agency operations, all in one place.</p></div><div className="date-pill">{new Date().toLocaleDateString("en-IN",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})}</div></div>
        {active === "Tasks & Projects" ? <TasksPanel role={role} userId={userId} />
          : active === "Team & Roles" ? <StaffPanel role={role} userId={userId} />
          : active === "Attendance" ? <AttendancePanel userId={userId} role={role} />
          : active === "Clients & CRM" ? <ClientsPanel role={role} />
          : active === "Daily Reports" ? <DailyReportsPanel userId={userId} role={role} />
          : active === "Leave Management" ? <LeavePanel userId={userId} role={role} />
          : active === "Content Calendar" ? <ContentCalendarPanel role={role} userId={userId} />
          : active === "Ads & Leads" ? <AdsLeadsPanel role={role} userId={userId} />
          : active === "Finance & Payroll" ? <FinancePanel role={role} userId={userId} />
          : active === "Academy Management" ? <AcademyPanel role={role} userId={userId} />
          : active === "HR Reports" ? <HrReportsPanel userId={userId} role={role} />
          : active === "Reports & Documents" ? <ReportsPanel />
          : active === "AI Engine" ? <AiEnginePanel userId={userId} />
          : active === "Settings" ? <SettingsPanel fullName={fullName} role={role} userId={userId} />
          : active === "Help & Support" ? <SettingsPanel fullName={fullName} role={role} userId={userId} />
          : active === "Announcements" ? <AnnouncementsPanel role={role} userId={userId} defaultTab={notificationFocus ? "notifications" : "announcements"} />
          : active === "Overview" ? <>
            <AgencyOverview role={role} userId={userId} onOpenAttendance={() => setActive("Attendance")} />
            <div className="section-head agency-modules-heading"><div><h2>All modules</h2><p>Your agency, in one workspace</p></div></div>
            <section className="panel"><div className="module-grid">{modules.filter(([title])=>visibleModules(role as SdmaRole).includes(title)).map(([title,detail,Icon,tone]) => <button key={title} className="module" onClick={() => setActive(title)}><span className={"module-icon "+tone}><Icon size={20}/></span><b>{title}</b><small>{detail}</small></button>)}</div></section>
            <footer><ShieldCheck size={15}/> Secure agency workspace <span>•</span> Role-based access enabled.</footer>
          </> : <section className="panel module-coming-soon"><div className="panel-head"><div><h3>{active}</h3><p>This workspace module is planned in the SDMA Office OS rollout.</p></div><ShieldCheck size={18}/></div><p>Access is role-controlled. The module will appear here after its database workflows and approval rules are completed.</p></section>}
      </div>
      <nav className="mobile-tabbar" aria-label="Primary navigation">{mobilePrimary.filter(label => label === "Overview" || visibleModules(role as SdmaRole).includes(label)).map(label => { const Icon = nav.find(item => item[0] === label)?.[1] ?? LayoutDashboard; return <button key={label} type="button" className={active === label ? "mobile-tab active" : "mobile-tab"} onClick={() => {setActive(label);setNotificationFocus(false);}}><Icon size={19}/><span>{label === "Tasks & Projects" ? "Tasks" : label === "Content Calendar" ? "Content" : label === "Announcements" ? "Updates" : label}</span></button>; })}</nav>
    </section>
  </main>;
}
