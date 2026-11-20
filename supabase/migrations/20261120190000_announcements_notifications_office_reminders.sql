
alter table public.announcements add column if not exists target_roles text[] null;
drop policy if exists "sdma_announcements_read" on public.announcements;
create policy "sdma_announcements_read" on public.announcements
for select to authenticated
using (
  (is_active = true and (target_roles is null or target_roles = '{}' or target_roles @> array[(select p.role::text from public.profiles p where p.id = auth.uid())]))
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ceo','operations_manager','team_lead','office_admin'))
);
create table if not exists public.office_reminders (
  id uuid primary key default gen_random_uuid(), title text not null, body text,
  reminder_time time not null, days_of_week smallint[] not null default array[1,2,3,4,5]::smallint[],
  is_active boolean not null default true, created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.office_reminders enable row level security;
drop policy if exists "office_reminders_read" on public.office_reminders;
drop policy if exists "office_reminders_manage" on public.office_reminders;
create policy "office_reminders_read" on public.office_reminders for select to authenticated using (is_active = true or public.taskpro_is_manager());
create policy "office_reminders_manage" on public.office_reminders for all to authenticated using (public.taskpro_is_manager()) with check (public.taskpro_is_manager() and created_by = auth.uid());
alter table public.notifications add column if not exists reminder_id uuid references public.office_reminders(id) on delete set null, add column if not exists reminder_date date;
create unique index if not exists notifications_reminder_once_per_day on public.notifications(user_id,reminder_id,reminder_date) where reminder_id is not null and reminder_date is not null;
create or replace function public.deliver_due_office_reminders()
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer:=0; v_today date:=(now() at time zone 'Asia/Kolkata')::date; v_now time:=(now() at time zone 'Asia/Kolkata')::time; v_dow smallint:=extract(dow from (now() at time zone 'Asia/Kolkata'))::smallint;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.notifications(user_id,title,body,notification_type,action_url,reminder_id,reminder_date)
 select auth.uid(),r.title,r.body,'reminder',null,r.id,v_today from public.office_reminders r
 where r.is_active=true and r.reminder_time<=v_now and r.days_of_week @> array[v_dow]::smallint[]
 on conflict (user_id,reminder_id,reminder_date) where reminder_id is not null and reminder_date is not null do nothing;
 get diagnostics v_count=row_count; return v_count;
end; $$;
revoke all on function public.deliver_due_office_reminders() from public,anon;
grant execute on function public.deliver_due_office_reminders() to authenticated;
