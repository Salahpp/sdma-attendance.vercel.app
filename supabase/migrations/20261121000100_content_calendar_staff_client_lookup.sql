create or replace function public.sdma_list_content_clients()
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $function$
  select c.id, c.name
  from public.clients c
  where exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
  )
  order by c.name;
$function$;

revoke all on function public.sdma_list_content_clients() from public, anon;
grant execute on function public.sdma_list_content_clients() to authenticated;
