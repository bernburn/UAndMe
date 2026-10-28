-- Run in a disposable development database after all migrations.
-- Every fixture is rolled back. A failing assertion aborts the transaction.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('10000000-0000-0000-0000-000000000001','mvp-test-organizer@ua.edu.ph',now(),'{"display_name":"Test Organizer"}'),
 ('10000000-0000-0000-0000-000000000002','mvp-test-student@ua.edu.ph',now(),'{"display_name":"Test Student"}'),
 ('10000000-0000-0000-0000-000000000003','mvp-test-other@ua.edu.ph',now(),'{"display_name":"Other Student"}');
do $$
declare h uuid; p uuid; rejected boolean;
begin
 perform set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
 h:=(public.campus_action('create_hangout',jsonb_build_object('title','Test UNO','description','Test only','category','Games','location','Library','starts_at',now()+interval '2 days','capacity',2))->>'id')::uuid;
 rejected:=false;
 begin perform public.campus_action('request',jsonb_build_object('id',h)); exception when others then rejected:=true; end;
 assert rejected,'Organizers must not request their own hangout';
 insert into public.posts(author_id,content) values(auth.uid(),'Rollback-only test post') returning id into p;
 perform set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
 perform public.campus_action('request',jsonb_build_object('id',h));
 rejected:=false;
 begin perform public.campus_action('request',jsonb_build_object('id',h)); exception when others then rejected:=true; end;
 assert rejected,'Duplicate active requests must fail';
 rejected:=false;
 begin perform public.campus_action('approve',jsonb_build_object('id',h,'user_id',auth.uid())); exception when others then rejected:=true; end;
 assert rejected,'Non-organizers must not approve requests';
 perform public.campus_action('like',jsonb_build_object('id',p));
 assert (select count(*)=1 from public.post_likes where post_id=p),'Like should persist';
 perform public.campus_action('like',jsonb_build_object('id',p));
 assert (select count(*)=0 from public.post_likes where post_id=p),'Unlike should remove the like';
 perform public.campus_action('comment',jsonb_build_object('id',p,'content','Test comment'));
 assert (select count(*)=1 from public.comments where post_id=p),'Comment should persist';
 perform set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
 perform public.campus_action('request',jsonb_build_object('id',h));
 perform set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
 perform public.campus_action('approve',jsonb_build_object('id',h,'user_id','10000000-0000-0000-0000-000000000002'));
 rejected:=false;
 begin perform public.campus_action('approve',jsonb_build_object('id',h,'user_id','10000000-0000-0000-0000-000000000003')); exception when others then rejected:=true; end;
 assert rejected,'Organizer plus confirmed students must not exceed capacity';
 assert (select count(*)=1 from public.join_requests where hangout_id=h and status='Approved'),'Only one student should be confirmed';
 perform public.campus_action('cancel',jsonb_build_object('id',h));
 assert (select status='Cancelled' from public.hangouts where id=h),'Cancellation should persist';
 assert exists(select 1 from public.notifications where hangout_id=h and message like '%cancelled%'),'Cancellation notifications should exist';
 perform public.campus_action('block',jsonb_build_object('id','10000000-0000-0000-0000-000000000002'));
 assert not public.can_connect('10000000-0000-0000-0000-000000000002'),'Block must restrict access';
 perform set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
 assert not public.can_connect('10000000-0000-0000-0000-000000000001'),'Block must work in both directions';
 rejected:=false;
 begin perform public.campus_action('moderate',jsonb_build_object('id',gen_random_uuid(),'remove',true)); exception when others then rejected:=true; end;
 assert rejected,'Students must not moderate';
 perform set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
 perform public.campus_action('report',jsonb_build_object('id',p,'target_type','post','reason','Test report for moderation'));
 insert into private.moderators(user_id) values('10000000-0000-0000-0000-000000000001');
 perform set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
 perform public.campus_action('moderate',jsonb_build_object('id',(select id from public.reports where target_id=p limit 1),'remove',true));
 assert not exists(select 1 from public.posts where id=p),'Moderators must be able to remove reported posts';
 assert (select status='Resolved' from public.reports where target_id=p),'Moderation must resolve the report';
end $$;
-- Exercise grants/RLS using an actual authenticated database role.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
do $$
declare changed int;
begin
 update public.profiles set bio='Unauthorized change' where id='10000000-0000-0000-0000-000000000001';
 get diagnostics changed=row_count;
 assert changed=0,'Students must not edit another profile';
 assert not exists(select 1 from public.notifications where recipient_id<>auth.uid()),'Private notifications must not be readable';
 assert exists(select 1 from public.hangouts where title='Test UNO'),'Verified students must see campus hangouts';
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
 assert exists(select 1 from public.hangouts where title='Test UNO'),'An organizer must be able to read their own activity';
end $$;
reset role;
rollback;
