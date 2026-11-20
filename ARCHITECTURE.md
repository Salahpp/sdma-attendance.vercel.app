# SDMA Office OS v2 Architecture

## Product goal
A clean, role-aware operating system for Shah Digital Marketing Agency. This is a new application on a dedicated branch and the new Supabase project; it does not depend on the legacy attendance application's compressed build pipeline.

## Platform
- Next.js App Router + TypeScript responsive web UI.
- Installable PWA for iOS and Android using a manifest, app icon and service worker. Offline support is progressive; sensitive operations always require server confirmation.
- Supabase Auth, Postgres, Storage and Realtime.
- Vercel preview deployments; production domain switches only after acceptance testing.

## Roles
- CEO: organization-wide visibility and full administration.
- Operations Manager: staff operations, approvals, schedules, reports and operational settings.
- Team Leader: task/project assignment, workload, review and team reporting.
- Staff: own tasks, attendance, daily reports, leave requests and assigned project information.
- Enforce authorization in Postgres RLS and server-side actions. UI visibility is not authorization.

## Modules
1. Executive dashboard and KPI snapshots.
2. People, profiles, invitations and role management.
3. Attendance: check-in/out, server timestamps, GPS, private selfie storage, breaks, hours and monthly summaries.
4. Tasks: assignment, priority, due dates, status, recurring tasks, activity and approvals.
5. Clients and CRM: contacts, service packages, status and notes.
6. Projects and delivery: milestones, owners, linked tasks and status.
7. Content calendar: briefs, drafts, creative uploads, review/approval and publishing status.
8. Ads and lead reporting: client-level spend, leads, CPL, sales and ROAS by reporting period.
9. Daily reports: morning plan, evening completion, blockers and lead counts.
10. Leave, shifts and office schedule.
11. Finance: expenses, receipts, approvals, payroll, advances and payment status.
12. Announcements, notifications and reminders.
13. Audit trail, exports and monthly performance reports.
14. Organization settings, retention and access management.

## Existing database foundation
New Supabase project `uisyfzvytnmsydjkkrni` already contains profiles, tasks, task_activity, attendance, payroll, daily_reports, leave_requests, expenses, clients and projects. Additive migrations will add private selfie object paths, content calendar, ads/leads, notifications, announcements, shifts and audit events. Preserve existing profiles; do not auto-seed client records.

## Security
- Browser uses only the Supabase publishable key.
- Service-role secrets remain server-only and never enter source control.
- Every exposed table has ownership/role-specific RLS.
- Selfies and receipts use private Storage buckets and short-lived signed URLs.
- Request GPS only at punch time; no continuous tracking.
- Audit sensitive actions and restrict payroll to authorized roles.
- Never trust client-supplied timestamps or role fields for authorization.

## Delivery sequence
1. Foundation: source tree, responsive shell, PWA metadata, typed Supabase clients.
2. Identity: sign-in, profiles, role guard, invitations and activation.
3. Operations: tasks, clients, projects, reports and attendance.
4. Creative/performance: calendar, approvals, ads and leads.
5. Administration: leave, expenses, payroll, notifications, audit and exports.
6. QA: RLS matrix, mobile camera/GPS, offline queue, accessibility and restore testing.
7. Release: production environment, domain switch and rollback plan.

## Operating assumptions
- Office hours: 09:30–17:30 India time.
- Daily client ads report target: 10:30 AM.
- Staff reports: morning and evening.
- Team Leader coordinates daily assignments; CEO and Operations Manager have agency-wide oversight.
