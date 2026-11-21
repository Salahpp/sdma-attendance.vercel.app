-- Task approval: only CEO and Team Lead can approve completion.
create or replace function public.enforce_task_completion_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.sdma_role;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    select p.role into v_role
    from public.profiles p
    where p.id = (select auth.uid()) and p.is_active = true;

    if coalesce(v_role::text, '') not in ('ceo', 'team_lead') then
      raise exception 'Only the CEO or Team Lead can approve task completion';
    end if;

    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'completed' and old.status = 'completed' then
    select p.role into v_role
    from public.profiles p
    where p.id = (select auth.uid()) and p.is_active = true;

    if coalesce(v_role::text, '') not in ('ceo', 'team_lead') then
      raise exception 'Only the CEO or Team Lead can reopen an approved task';
    end if;
    new.completed_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tasks_completion_approval_guard on public.tasks;
create trigger tasks_completion_approval_guard
before update of status on public.tasks
for each row execute function public.enforce_task_completion_approval();

revoke all on function public.enforce_task_completion_approval() from public, anon, authenticated;

-- Private, aggregate-only monthly staff scoreboard. No attendance photos, GPS or report text are exposed.
create or replace function public.get_staff_scoreboard(p_month date default date_trunc('month', timezone('Asia/Kolkata', now()))::date)
returns table (
  user_id uuid,
  full_name text,
  role text,
  score integer,
  completed_tasks integer,
  assigned_tasks integer,
  on_time_tasks integer,
  attendance_days integer,
  report_days integer,
  rank bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select date_trunc('month', p_month)::date as start_date,
           least((date_trunc('month', p_month) + interval '1 month - 1 day')::date,
                 (timezone('Asia/Kolkata', now()))::date) as end_date
  ),
  weekdays as (
    select count(*)::numeric as total
    from bounds b, generate_series(b.start_date, b.end_date, interval '1 day') d
    where extract(isodow from d) between 1 and 5
  ),
  staff as (
    select p.id, p.full_name, p.role::text as role
    from public.profiles p
    where p.is_active = true and p.role::text not in ('ceo','operations_manager')
  ),
  task_stats as (
    select t.assigned_to as user_id,
      count(*) filter (where t.status = 'completed')::int as completed,
      count(*)::int as assigned,
      count(*) filter (where t.status = 'completed' and t.due_date is not null
                         and t.completed_at::date <= t.due_date)::int as on_time
    from public.tasks t, bounds b
    where t.assigned_to is not null
      and t.created_at::date between b.start_date and b.end_date
    group by t.assigned_to
  ),
  attendance_stats as (
    select a.user_id, count(*) filter (where a.status in ('present','late'))::int as days
    from public.attendance a, bounds b
    where a.attendance_date between b.start_date and b.end_date
    group by a.user_id
  ),
  report_stats as (
    select r.user_id, count(distinct r.report_date)::int as days
    from public.daily_reports r, bounds b
    where r.report_date between b.start_date and b.end_date
    group by r.user_id
  ),
  scores as (
    select s.id as user_id, coalesce(s.full_name,'Staff member') as full_name, s.role,
      coalesce(ts.completed,0) as completed_tasks,
      coalesce(ts.assigned,0) as assigned_tasks,
      coalesce(ts.on_time,0) as on_time_tasks,
      coalesce(ast.days,0) as attendance_days,
      coalesce(rs.days,0) as report_days,
      round(
        (case when coalesce(ts.assigned,0)>0 then ts.completed::numeric/ts.assigned*50 else 0 end) +
        (case when coalesce(ts.completed,0)>0 then ts.on_time::numeric/ts.completed*20 else 0 end) +
        (case when w.total>0 then least(coalesce(ast.days,0)/w.total,1)*20 else 0 end) +
        (case when w.total>0 then least(coalesce(rs.days,0)/w.total,1)*10 else 0 end)
      )::int as score
    from staff s
    cross join weekdays w
    left join task_stats ts on ts.user_id=s.id
    left join attendance_stats ast on ast.user_id=s.id
    left join report_stats rs on rs.user_id=s.id
  )
  select sc.user_id, sc.full_name, sc.role, sc.score, sc.completed_tasks,
         sc.assigned_tasks, sc.on_time_tasks, sc.attendance_days, sc.report_days,
         dense_rank() over (order by sc.score desc, sc.completed_tasks desc)::bigint as rank
  from scores sc
  order by rank, sc.full_name;
$$;

revoke all on function public.get_staff_scoreboard(date) from public, anon;
grant execute on function public.get_staff_scoreboard(date) to authenticated;
