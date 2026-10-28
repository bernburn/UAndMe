begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('30000000-0000-0000-0000-000000000001','photo-owner@ua.edu.ph',now(),'{"display_name":"Photo Owner"}'),
 ('30000000-0000-0000-0000-000000000002','photo-viewer@ua.edu.ph',now(),'{"display_name":"Photo Viewer"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
insert into storage.objects(bucket_id,name) values('avatars','30000000-0000-0000-0000-000000000001/test.png');
update public.profiles set avatar_path='30000000-0000-0000-0000-000000000001/test.png' where id=auth.uid();
do $$ begin
 assert (select profile_completed_at is null from public.profiles where id=auth.uid()),'Uploading a photo must not complete onboarding';
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
do $$ declare rejected boolean:=false;begin
 assert exists(select 1 from storage.objects where name like '%/test.png'),'Verified students can read a linked avatar';
 begin insert into storage.objects(bucket_id,name) values('avatars','30000000-0000-0000-0000-000000000001/forged.png');exception when others then rejected:=true;end;
 assert rejected,'Cannot upload into another student folder';
end $$;
select public.campus_action('block','{"id":"30000000-0000-0000-0000-000000000001"}');
do $$ begin assert not exists(select 1 from storage.objects where name like '%/test.png'),'Blocks must hide linked avatar objects';end $$;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
update public.profiles set avatar_path=null where id=auth.uid();
delete from storage.objects where name='30000000-0000-0000-0000-000000000001/test.png';
reset role;
insert into public.notifications(recipient_id,message,created_at) select '30000000-0000-0000-0000-000000000001','Paged notice '||i,now()+i*interval '1 second' from generate_series(1,45) i;
do $$ declare page1 uuid[];page2 uuid[];begin
 select array_agg(id) into page1 from (select id from public.notifications where recipient_id='30000000-0000-0000-0000-000000000001' order by created_at desc,id desc limit 20) q;
 select array_agg(id) into page2 from (select id from public.notifications where recipient_id='30000000-0000-0000-0000-000000000001' order by created_at desc,id desc offset 20 limit 20) q;
 assert cardinality(page1)=20 and cardinality(page2)=20,'Lists must continue past the first page';
 assert not page1&&page2,'Stable pages must not overlap';
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
do $$ declare p uuid;totals jsonb;begin
 insert into public.posts(author_id,content) values(auth.uid(),'Counts fixture') returning id into p;
 insert into public.comments(post_id,author_id,content) select p,auth.uid(),'Comment '||i from generate_series(1,45)i;
 totals:=public.activity_counts(array[p],'{}'::uuid[]);
 assert (totals->'posts'->p::text->>'comments')::int=45,'Counts must reflect all comment pages';
end $$;
rollback;
