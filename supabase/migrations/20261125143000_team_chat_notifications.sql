create or replace function public.sdma_notify_team_chat_message()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.notifications(user_id,title,body,notification_type,action_url)
 select p.id,'New team chat message',left(new.message,180),'team_chat','/dashboard?section=chat'
 from public.profiles p where p.is_active=true and p.id<>new.sender_id;
 return new;
end; $$;
revoke all on function public.sdma_notify_team_chat_message() from public,anon;
drop trigger if exists sdma_team_chat_notification_trigger on public.sdma_team_messages;
create trigger sdma_team_chat_notification_trigger
after insert on public.sdma_team_messages
for each row execute function public.sdma_notify_team_chat_message();
