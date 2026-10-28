begin;
create table public.hangout_likes (
 hangout_id uuid references public.hangouts on delete cascade,
 user_id uuid references public.profiles on delete cascade,
 primary key(hangout_id,user_id)
);
create table public.hangout_comments (
 id uuid primary key default gen_random_uuid(),
 hangout_id uuid not null references public.hangouts on delete cascade,
 author_id uuid not null references public.profiles on delete cascade,
 content text not null check(char_length(btrim(content)) between 1 and 1000),
 created_at timestamptz not null default now()
);
create index on public.hangout_comments(hangout_id,created_at);
alter table public.hangout_likes enable row level security;
alter table public.hangout_comments enable row level security;
revoke all on public.hangout_likes,public.hangout_comments from public,anon,authenticated;
grant select on public.hangout_likes,public.hangout_comments to authenticated;
create policy hangout_likes_read on public.hangout_likes for select to authenticated
 using(exists(select 1 from public.hangouts h where h.id=hangout_id));
create policy hangout_comments_read on public.hangout_comments for select to authenticated
 using(public.can_connect(author_id) and exists(select 1 from public.hangouts h where h.id=hangout_id));
create function public.hangout_interaction(action text,activity_id uuid,comment_text text default null)
returns void language plpgsql security definer set search_path='' as $$
declare h public.hangouts; me uuid:=auth.uid();
begin
 if not public.is_verified_student() then raise exception 'Verify your university email before continuing.'; end if;
 select * into h from public.hangouts where id=activity_id for update;
 if not found or not public.can_connect(h.organizer_id) then raise exception 'Hangout unavailable.'; end if;
 if action='like' then
  if exists(select 1 from public.hangout_likes where hangout_id=activity_id and user_id=me) then
   delete from public.hangout_likes where hangout_id=activity_id and user_id=me;
  else insert into public.hangout_likes values(activity_id,me); end if;
 elsif action='comment' then
  insert into public.hangout_comments(hangout_id,author_id,content) values(activity_id,me,btrim(comment_text));
  if h.organizer_id<>me then
   insert into public.notifications(recipient_id,message,hangout_id)
   values(h.organizer_id,'Someone commented on your hangout: '||h.title,activity_id);
  end if;
 elsif action='delete' then
  if h.organizer_id<>me then raise exception 'Only the organizer can delete this hangout.'; end if;
  -- Keep notifications after cascading deletion, with no dangling activity link.
  insert into public.notifications(recipient_id,message)
  select user_id,'The organizer deleted '||h.title||'. This activity will not take place.'
  from public.join_requests where hangout_id=activity_id and status in ('Pending','Approved');
  delete from public.hangouts where id=activity_id;
 else raise exception 'Unknown hangout interaction.';
 end if;
end;$$;
revoke all on function public.hangout_interaction(text,uuid,text) from public,anon;
grant execute on function public.hangout_interaction(text,uuid,text) to authenticated;
commit;
