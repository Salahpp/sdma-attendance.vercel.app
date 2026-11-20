-- Enforce manager-only content approval and publishing at the database layer.
create or replace function public.enforce_content_approval_workflow()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_role public.sdma_role;
  v_manager boolean;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = (select auth.uid()) and p.is_active = true;

  v_manager := coalesce(v_role in ('ceo','operations_manager','team_lead','office_admin'), false);

  if not v_manager and (
    new.status in ('approved','scheduled','published','rejected')
    or new.approved_by is distinct from old.approved_by
    or new.approved_at is distinct from old.approved_at
    or new.published_at is distinct from old.published_at
  ) then
    raise exception 'Only a manager can approve, reject or publish content';
  end if;

  if v_manager and new.status = 'approved' and old.status is distinct from 'approved' then
    new.approved_by := (select auth.uid());
    new.approved_at := now();
  elsif v_manager and new.status in ('scheduled','published') and new.approved_at is null then
    new.approved_by := (select auth.uid());
    new.approved_at := now();
  end if;

  if v_manager and new.status = 'published' and old.status is distinct from 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists content_items_approval_workflow on public.content_items;
create trigger content_items_approval_workflow
before update on public.content_items
for each row execute function public.enforce_content_approval_workflow();

revoke all on function public.enforce_content_approval_workflow() from public, anon, authenticated;
