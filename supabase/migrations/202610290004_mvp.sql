begin;
-- Apply after migrations 001–003. All writes below go through campus_action.
create table public.user_blocks(blocker_id uuid references public.profiles on delete cascade, blocked_id uuid references public.profiles on delete cascade, primary key(blocker_id,blocked_id),check(blocker_id<>blocked_id));
create table private.moderators(user_id uuid primary key references public.profiles on delete cascade);
alter table private.moderators enable row level security;
revoke all on private.moderators from public,anon,authenticated;
create function public.is_moderator() returns boolean language sql stable security definer set search_path='' as $$select public.is_verified_student() and exists(select 1 from private.moderators where user_id=auth.uid())$$;
create function public.can_connect(other_id uuid) returns boolean language sql stable security definer set search_path='' as $$select public.is_verified_student() and not exists(select 1 from public.user_blocks where (blocker_id=auth.uid() and blocked_id=other_id) or (blocked_id=auth.uid() and blocker_id=other_id))$$;
create table public.post_likes(post_id uuid references public.posts on delete cascade,user_id uuid references public.profiles on delete cascade,primary key(post_id,user_id));
create table public.comments(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.posts on delete cascade,author_id uuid not null references public.profiles on delete cascade,content text not null check(length(btrim(content)) between 1 and 1000),created_at timestamptz not null default now());
create index on public.comments(post_id,created_at);
create table public.hangouts(id uuid primary key default gen_random_uuid(),organizer_id uuid not null references public.profiles on delete cascade,title text not null check(length(btrim(title)) between 3 and 100),description text not null check(length(description)<=2000),category text not null check(category in ('Games','Study','Sports','Food','Casual','Other')),location text not null check(length(btrim(location)) between 2 and 200),starts_at timestamptz not null,capacity int not null check(capacity between 2 and 100),status text not null default 'Upcoming' check(status in ('Upcoming','Ongoing','Completed','Cancelled')),created_at timestamptz not null default now());
create index on public.hangouts(starts_at,category);
create table public.join_requests(hangout_id uuid references public.hangouts on delete cascade,user_id uuid references public.profiles on delete cascade,status text not null check(status in ('Pending','Approved','Rejected','Withdrawn')),created_at timestamptz not null default now(),primary key(hangout_id,user_id));
create index on public.join_requests(user_id,status);
create table public.notifications(id uuid primary key default gen_random_uuid(),recipient_id uuid not null references public.profiles on delete cascade,message text not null,hangout_id uuid references public.hangouts on delete cascade,read_at timestamptz,created_at timestamptz not null default now());
create index on public.notifications(recipient_id,created_at desc);
create table public.reports(id uuid primary key default gen_random_uuid(),reporter_id uuid not null references public.profiles on delete cascade,target_type text not null check(target_type in ('post','hangout','account')),target_id uuid not null,reason text not null check(length(btrim(reason)) between 5 and 1000),status text not null default 'Open' check(status in ('Open','Resolved')),created_at timestamptz not null default now());
create index on public.reports(status,created_at);
alter table public.user_blocks enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.hangouts enable row level security;
alter table public.join_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
revoke all on public.user_blocks,public.post_likes,public.comments,public.hangouts,public.join_requests,public.notifications,public.reports from public,anon,authenticated;
grant select on public.user_blocks,public.post_likes,public.comments,public.hangouts,public.join_requests,public.notifications,public.reports to authenticated;
create policy blocks_read on public.user_blocks for select to authenticated using(blocker_id=auth.uid());
drop policy verified_profile_read on public.profiles;
create policy verified_profile_read on public.profiles for select to authenticated using(public.can_connect(id));
drop policy verified_posts_read on public.posts;
create policy verified_posts_read on public.posts for select to authenticated using(public.can_connect(author_id));
create policy likes_read on public.post_likes for select to authenticated using(exists(select 1 from public.posts p where p.id=post_id));
create policy comments_read on public.comments for select to authenticated using(public.can_connect(author_id) and exists(select 1 from public.posts p where p.id=post_id));
create policy hangouts_read on public.hangouts for select to authenticated using(public.can_connect(organizer_id));
create policy requests_read on public.join_requests for select to authenticated using(public.is_verified_student() and exists(select 1 from public.hangouts h where h.id=hangout_id and (h.organizer_id=auth.uid() or user_id=auth.uid() or join_requests.status='Approved')));
create policy notifications_read on public.notifications for select to authenticated using(public.is_verified_student() and recipient_id=auth.uid());
create policy reports_read on public.reports for select to authenticated using(public.is_moderator());

create function public.campus_action(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); target uuid; h public.hangouts; p public.posts; r public.reports; other uuid; amount int; result_id uuid;
begin
 if not public.is_verified_student() then raise exception 'Verify your university email before continuing.'; end if;
 target:=nullif(payload->>'id','')::uuid;
 if action='like' or action='comment' then
  select * into p from public.posts where id=target;
  if not found or not public.can_connect(p.author_id) then raise exception 'Post unavailable.'; end if;
  if action='like' then
   if exists(select 1 from public.post_likes where post_id=target and user_id=me) then delete from public.post_likes where post_id=target and user_id=me; else insert into public.post_likes values(target,me); end if;
  else
   insert into public.comments(post_id,author_id,content) values(target,me,btrim(payload->>'content'));
   if p.author_id<>me then insert into public.notifications(recipient_id,message) values(p.author_id,'Someone commented on your campus post.'); end if;
  end if;
 elsif action='create_hangout' then
  if (payload->>'starts_at')::timestamptz<=now() then raise exception 'Choose a future start time.'; end if;
  insert into public.hangouts(organizer_id,title,description,category,location,starts_at,capacity) values(me,btrim(payload->>'title'),payload->>'description',payload->>'category',btrim(payload->>'location'),(payload->>'starts_at')::timestamptz,(payload->>'capacity')::int) returning id into result_id;
 elsif action in ('request','withdraw','approve','reject','edit_hangout','cancel','status') then
  select * into h from public.hangouts where id=target for update;
  if not found or not public.can_connect(h.organizer_id) then raise exception 'Hangout unavailable.'; end if;
  if action in ('approve','reject','edit_hangout','cancel','status') and h.organizer_id<>me then raise exception 'Only the organizer can do this.'; end if;
  if action='request' then
   if h.organizer_id=me or h.status<>'Upcoming' or h.starts_at<=now() then raise exception 'This activity is not accepting requests.'; end if;
   if exists(select 1 from public.join_requests where hangout_id=target and user_id=me and status in ('Pending','Approved')) then raise exception 'You already have an active request.'; end if;
   select count(*)+1 into amount from public.join_requests where hangout_id=target and status='Approved';
   if amount>=h.capacity then raise exception 'This hangout is full.'; end if;
   insert into public.join_requests(hangout_id,user_id,status) values(target,me,'Pending') on conflict(hangout_id,user_id) do update set status='Pending',created_at=now();
   insert into public.notifications(recipient_id,message,hangout_id) values(h.organizer_id,'New join request for '||h.title,target);
  elsif action='withdraw' then
   update public.join_requests set status='Withdrawn' where hangout_id=target and user_id=me and status in ('Pending','Approved');
  elsif action in ('approve','reject') then
   other:=(payload->>'user_id')::uuid;
   if other=me or not public.can_connect(other) then raise exception 'Cannot manage this request.'; end if;
   if h.status<>'Upcoming' or h.starts_at<=now() then raise exception 'This hangout is no longer accepting participants.'; end if;
   if action='approve' then
    select count(*)+1 into amount from public.join_requests where hangout_id=target and status='Approved';
    if amount>=h.capacity then raise exception 'No slots left.'; end if;
   end if;
   update public.join_requests set status=case when action='approve' then 'Approved' else 'Rejected' end where hangout_id=target and user_id=other and status='Pending';
   if not found then raise exception 'Request is no longer pending.'; end if;
   insert into public.notifications(recipient_id,message,hangout_id) values(other,'Your request for '||h.title||' was '||case when action='approve' then 'approved.' else 'rejected.' end,target);
  elsif action='cancel' then
   update public.hangouts set status='Cancelled' where id=target;
   insert into public.notifications(recipient_id,message,hangout_id) select user_id,h.title||' has been cancelled.',target from public.join_requests where hangout_id=target and status in ('Pending','Approved');
  elsif action='status' then
   if h.status in ('Cancelled','Completed') or payload->>'status' not in ('Ongoing','Completed') then raise exception 'Invalid status change.'; end if;
   update public.hangouts set status=payload->>'status' where id=target;
  else
   if h.status<>'Upcoming' then raise exception 'Only upcoming hangouts can be edited.'; end if;
   select count(*)+1 into amount from public.join_requests where hangout_id=target and status='Approved';
   if (payload->>'capacity')::int<amount then raise exception 'Capacity is below the confirmed participant count.'; end if;
   if (payload->>'starts_at')::timestamptz<=now() then raise exception 'Choose a future start time.'; end if;
   update public.hangouts set title=btrim(payload->>'title'),description=payload->>'description',category=payload->>'category',location=btrim(payload->>'location'),starts_at=(payload->>'starts_at')::timestamptz,capacity=(payload->>'capacity')::int where id=target;
  end if;
 elsif action='read_notification' then
  update public.notifications set read_at=now() where id=target and recipient_id=me;
 elsif action='block' then
  insert into public.user_blocks values(me,target) on conflict do nothing;
 elsif action='unblock' then
  delete from public.user_blocks where blocker_id=me and blocked_id=target;
 elsif action='report' then
  if payload->>'target_type'='post' then perform 1 from public.posts where id=target and public.can_connect(author_id);
  elsif payload->>'target_type'='hangout' then perform 1 from public.hangouts where id=target and public.can_connect(organizer_id);
  elsif payload->>'target_type'='account' then perform 1 from public.profiles where id=target and public.can_connect(id);
  else raise exception 'Invalid report target.'; end if;
  if not found then raise exception 'Content unavailable.'; end if;
  insert into public.reports(reporter_id,target_type,target_id,reason) values(me,payload->>'target_type',target,btrim(payload->>'reason'));
 elsif action='moderate' then
  if not public.is_moderator() then raise exception 'Moderator access required.'; end if;
  select * into r from public.reports where id=target for update;
  if not found then raise exception 'Report not found.'; end if;
  if coalesce((payload->>'remove')::boolean,false) then
   if r.target_type='post' then delete from public.posts where id=r.target_id;
   elsif r.target_type='hangout' then
    insert into public.notifications(recipient_id,message,hangout_id) select user_id,'A moderator removed an activity you joined.',r.target_id from public.join_requests where hangout_id=r.target_id and status in ('Pending','Approved');
    update public.hangouts set status='Cancelled',title='Removed activity',location='Campus',description='Removed by campus moderation.' where id=r.target_id;
   else raise exception 'Account reports require review in the Supabase admin dashboard.'; end if;
  end if;
  update public.reports set status='Resolved' where id=target;
 else raise exception 'Unknown action.';
 end if;
 return jsonb_build_object('id',result_id,'ok',true);
end;$$;
revoke all on function public.is_moderator(),public.can_connect(uuid),public.campus_action(text,jsonb) from public,anon;
grant execute on function public.is_moderator(),public.can_connect(uuid),public.campus_action(text,jsonb) to authenticated;
commit;
