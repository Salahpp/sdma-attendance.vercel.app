create or replace function public.sdma_admin_manual_checkout_session(p_session_id uuid,p_checkout timestamptz,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_role text; v_row public.attendance_sessions%rowtype;
begin
 if v_actor is null then raise exception 'Authentication required'; end if;
 select role::text into v_role from public.profiles where id=v_actor and is_active=true;
 if v_role not in ('ceo','operations_manager','team_lead','office_admin') then raise exception 'Not authorized to recover attendance'; end if;
 if p_reason is null or length(trim(p_reason))<5 then raise exception 'Correction reason must be at least 5 characters'; end if;
 if p_checkout is null then raise exception 'Checkout timestamp is required'; end if;
 update public.attendance_sessions set check_out=p_checkout,check_out_note='ADMIN MANUAL CHECKOUT: '||trim(p_reason),updated_at=now()
 where id=p_session_id and check_out is null and check_in is not null returning * into v_row;
 if not found then raise exception 'Session not found or already closed'; end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
 values(v_actor,'attendance_manual_checkout','attendance_sessions',v_row.id,jsonb_build_object('user_id',v_row.user_id,'attendance_date',v_row.attendance_date,'check_in',v_row.check_in,'check_out',p_checkout,'reason',trim(p_reason)));
 return to_jsonb(v_row);
end; $$;
revoke all on function public.sdma_admin_manual_checkout_session(uuid,timestamptz,text) from public,anon;
grant execute on function public.sdma_admin_manual_checkout_session(uuid,timestamptz,text) to authenticated;