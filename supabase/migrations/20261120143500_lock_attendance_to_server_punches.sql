drop policy if exists "attendance self insert" on public.attendance;
drop policy if exists "attendance self update or manager" on public.attendance;
create policy "attendance manager corrections" on public.attendance for update to authenticated using (public.taskpro_is_manager()) with check (public.taskpro_is_manager());