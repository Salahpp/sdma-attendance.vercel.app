alter table public.leads
  add column if not exists campaign_name text,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists last_contacted_at timestamptz;

create index if not exists leads_client_status_idx on public.leads(client_id,status);
create index if not exists leads_assigned_followup_idx on public.leads(assigned_to,next_follow_up_at);
create index if not exists ad_reports_client_date_idx on public.ad_reports(client_id,report_date desc);

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id),
  activity_type text not null default 'note' check (activity_type in ('note','call','whatsapp','email','meeting','status_change')),
  details text not null,
  created_at timestamptz not null default now()
);
create index if not exists lead_activities_lead_created_idx on public.lead_activities(lead_id,created_at desc);
alter table public.lead_activities enable row level security;

drop policy if exists lead_activities_read_accessible on public.lead_activities;
create policy lead_activities_read_accessible on public.lead_activities
for select to authenticated
using (exists (
  select 1 from public.leads l
  where l.id=lead_activities.lead_id
  and (l.assigned_to=(select auth.uid()) or l.created_by=(select auth.uid()) or exists (
    select 1 from public.profiles p where p.id=(select auth.uid())
    and p.role in ('ceo','operations_manager','team_lead','office_admin')
  ))
));

drop policy if exists lead_activities_insert_accessible on public.lead_activities;
create policy lead_activities_insert_accessible on public.lead_activities
for insert to authenticated
with check (
  user_id=(select auth.uid()) and exists (
    select 1 from public.leads l
    where l.id=lead_activities.lead_id
    and (l.assigned_to=(select auth.uid()) or l.created_by=(select auth.uid()) or exists (
      select 1 from public.profiles p where p.id=(select auth.uid())
      and p.role in ('ceo','operations_manager','team_lead','office_admin')
    ))
  )
);
