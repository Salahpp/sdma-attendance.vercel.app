-- SDMA Office OS v2: additive operational modules.
-- Existing profile rows and current core tables are preserved.

alter table public.attendance
  add column if not exists check_in_selfie_path text,
  add column if not exists check_out_selfie_path text;

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  platform text,
  content_type text,
  caption text,
  status text not null default 'idea' check (status in ('idea','planned','in_progress','review','approved','scheduled','published','rejected')),
  due_at timestamptz,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid not null default auth.uid() references public.profiles(id),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  creative_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_comments (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id),
  comment text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ad_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  report_date date not null default current_date,
  platform text not null default 'Meta',
  campaign_name text,
  spend numeric(12,2) not null default 0 check (spend >= 0),
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  leads integer not null default 0 check (leads >= 0),
  sales_count integer not null default 0 check (sales_count >= 0),
  sales_value numeric(12,2) not null default 0 check (sales_value >= 0),
  notes text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  source text,
  status text not null default 'new' check (status in ('new','contacted','qualified','converted','lost')),
  assigned_to uuid references public.profiles(id) on delete set null,
  estimated_value numeric(12,2) not null default 0,
  notes text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  notification_type text not null default 'info',
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.office_shifts (
  id uuid primary key default gen_random_uuid(),
  assigned_user_id uuid references public.profiles(id) on delete cascade,
  day_of_week smallint check (day_of_week between 0 and 6),
  effective_date date,
  start_time time not null default '09:30',
  end_time time not null default '17:30',
  break_minutes integer not null default 0 check (break_minutes >= 0),
  is_working_day boolean not null default true,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  check (day_of_week is not null or effective_date is not null)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists content_items_client_due_idx on public.content_items(client_id, due_at);
create index if not exists content_items_assignee_status_idx on public.content_items(assigned_to, status);
create index if not exists content_comments_item_idx on public.content_comments(content_item_id, created_at desc);
create index if not exists ad_reports_client_date_idx on public.ad_reports(client_id, report_date desc);
create index if not exists leads_assignee_status_idx on public.leads(assigned_to, status);
create index if not exists leads_client_created_idx on public.leads(client_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, read_at, created_at desc);
create index if not exists announcements_active_idx on public.announcements(is_active, expires_at);
create index if not exists office_shifts_user_date_idx on public.office_shifts(assigned_user_id, effective_date);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

alter table public.content_items enable row level security;
alter table public.content_comments enable row level security;
alter table public.ad_reports enable row level security;
alter table public.leads enable row level security;
alter table public.notifications enable row level security;
alter table public.announcements enable row level security;
alter table public.office_shifts enable row level security;
alter table public.audit_logs enable row level security;

create policy "sdma_content_read" on public.content_items for select to authenticated using (true);
create policy "sdma_content_create" on public.content_items for insert to authenticated with check (created_by = (select auth.uid()));
create policy "sdma_content_update" on public.content_items for update to authenticated
using (assigned_to = (select auth.uid()) or created_by = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')))
with check (assigned_to = (select auth.uid()) or created_by = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')));
create policy "sdma_content_delete_managers" on public.content_items for delete to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')));

create policy "sdma_content_comments_read" on public.content_comments for select to authenticated using (true);
create policy "sdma_content_comments_create" on public.content_comments for insert to authenticated with check (user_id = (select auth.uid()));
create policy "sdma_content_comments_delete" on public.content_comments for delete to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')));

create policy "sdma_ads_read_managers" on public.ad_reports for select to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')));
create policy "sdma_ads_insert_managers" on public.ad_reports for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')));
create policy "sdma_ads_update_managers" on public.ad_reports for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')));

create policy "sdma_leads_read_assigned_or_manager" on public.leads for select to authenticated
using (assigned_to = (select auth.uid()) or created_by = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')));
create policy "sdma_leads_create" on public.leads for insert to authenticated with check (created_by = (select auth.uid()));
create policy "sdma_leads_update_assigned_or_manager" on public.leads for update to authenticated
using (assigned_to = (select auth.uid()) or created_by = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')))
with check (assigned_to = (select auth.uid()) or created_by = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')));

create policy "sdma_notifications_read_own" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "sdma_notifications_update_own" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "sdma_notifications_insert_managers" on public.notifications for insert to authenticated with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')));

create policy "sdma_announcements_read" on public.announcements for select to authenticated
using (is_active = true or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')));
create policy "sdma_announcements_manage" on public.announcements for all to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')))
with check (created_by = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')));

create policy "sdma_shifts_read" on public.office_shifts for select to authenticated
using (assigned_user_id is null or assigned_user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')));
create policy "sdma_shifts_manage" on public.office_shifts for all to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')))
with check (created_by = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin')));

create policy "sdma_audit_read_managers" on public.audit_logs for select to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager')));
create policy "sdma_audit_insert_self" on public.audit_logs for insert to authenticated with check (actor_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('attendance-selfies','attendance-selfies',false,5242880,array['image/jpeg','image/png','image/webp']),
  ('expense-receipts','expense-receipts',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false;

create policy "sdma_selfie_upload_own_folder" on storage.objects for insert to authenticated with check (bucket_id = 'attendance-selfies' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "sdma_selfie_read_own_or_manager" on storage.objects for select to authenticated
using (bucket_id = 'attendance-selfies' and ((storage.foldername(name))[1] = (select auth.uid())::text or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','team_lead','office_admin'))));
create policy "sdma_receipt_upload_own_folder" on storage.objects for insert to authenticated with check (bucket_id = 'expense-receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "sdma_receipt_read_own_or_finance" on storage.objects for select to authenticated
using (bucket_id = 'expense-receipts' and ((storage.foldername(name))[1] = (select auth.uid())::text or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('ceo','operations_manager','accounts'))));
