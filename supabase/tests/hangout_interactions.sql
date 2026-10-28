begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('20000000-0000-0000-0000-000000000001','interaction-owner@ua.edu.ph',now(),'{"display_name":"Test Owner"}'),
 ('20000000-0000-0000-0000-000000000002','interaction-student@ua.edu.ph',now(),'{"display_name":"Test Student"}');
do $$
declare h uuid; rejected boolean;
begin
 perform set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
 h:=(public.campus_action('create_hangout',jsonb_build_object('title','Interaction Test','description','Rollback only','category','Games','location','Library','starts_at',now()+interval '1 day','capacity',3))->>'id')::uuid;
 perform set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
 perform public.hangout_interaction('like',h);
 assert (select count(*)=1 from public.hangout_likes where hangout_id=h),'Hangout like must persist';
 perform public.hangout_interaction('like',h);
 assert not exists(select 1 from public.hangout_likes where hangout_id=h),'Unlike must remove the like';
 perform public.hangout_interaction('comment',h,'Is everyone welcome?');
 assert (select count(*)=1 from public.hangout_comments where hangout_id=h),'Comment must persist';
 assert exists(select 1 from public.notifications where hangout_id=h and recipient_id='20000000-0000-0000-0000-000000000001'),'Organizer must receive a comment notification';
 rejected:=false;
 begin perform public.hangout_interaction('comment',h,'  '); exception when others then rejected:=true; end;
 assert rejected,'Blank comments must fail';
 rejected:=false;
 begin perform public.hangout_interaction('delete',h); exception when others then rejected:=true; end;
 assert rejected,'Non-organizers must not delete';
 perform public.campus_action('request',jsonb_build_object('id',h));
 perform set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
 perform public.hangout_interaction('delete',h);
 assert not exists(select 1 from public.hangouts where id=h),'Owner deletion must remove the activity';
 assert not exists(select 1 from public.hangout_comments where hangout_id=h),'Activity comments must cascade';
 assert exists(select 1 from public.notifications where recipient_id='20000000-0000-0000-0000-000000000002' and hangout_id is null and message like '%deleted%'),'Deletion notice must survive';
end $$;
rollback;
