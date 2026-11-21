alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

create or replace function public.protect_must_change_password()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.must_change_password is distinct from old.must_change_password
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Only the secure account service can change password reset status';
  end if;
  return new;
end;
$function$;

drop trigger if exists protect_must_change_password on public.profiles;
create trigger protect_must_change_password
before update of must_change_password on public.profiles
for each row execute function public.protect_must_change_password();

revoke all on function public.protect_must_change_password() from public, anon, authenticated;
