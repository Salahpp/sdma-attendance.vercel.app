create or replace function public.taskpro_can_view_finance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('ceo','operations_manager','accounts')
  );
$$;
revoke all on function public.taskpro_can_view_finance() from public, anon;
grant execute on function public.taskpro_can_view_finance() to authenticated;

drop policy if exists "expenses manager all" on public.expenses;
drop policy if exists "expenses finance read all" on public.expenses;
drop policy if exists "expenses submit own pending" on public.expenses;
drop policy if exists "expenses finance update" on public.expenses;
create policy "expenses finance read all" on public.expenses
for select to authenticated using (public.taskpro_can_view_finance() or created_by = auth.uid());
create policy "expenses submit own pending" on public.expenses
for insert to authenticated with check (created_by = auth.uid() and approval_status = 'pending');
create policy "expenses finance update" on public.expenses
for update to authenticated using (public.taskpro_can_view_finance()) with check (public.taskpro_can_view_finance());

drop policy if exists "payroll manager all" on public.payroll;
create policy "payroll finance only" on public.payroll
for all to authenticated using (public.taskpro_can_view_finance()) with check (public.taskpro_can_view_finance());

drop policy if exists "Expense receipts read" on storage.objects;
drop policy if exists "Expense receipts upload" on storage.objects;
drop policy if exists "Expense receipts finance delete" on storage.objects;
create policy "Expense receipts read" on storage.objects
for select to authenticated using (
  bucket_id = 'expense-receipts'
  and (public.taskpro_can_view_finance() or (storage.foldername(name))[1] = auth.uid()::text)
);
create policy "Expense receipts upload" on storage.objects
for insert to authenticated with check (
  bucket_id = 'expense-receipts' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "Expense receipts finance delete" on storage.objects
for delete to authenticated using (bucket_id = 'expense-receipts' and public.taskpro_can_view_finance());
