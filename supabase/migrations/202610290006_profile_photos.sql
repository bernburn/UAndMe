begin;
alter table public.profiles add column avatar_path text;
alter table public.profiles add column profile_completed_at timestamptz;
update public.profiles set profile_completed_at=updated_at where updated_at<>created_at;
grant update(profile_completed_at) on public.profiles to authenticated;
alter table public.profiles add constraint own_avatar_path check(avatar_path is null or avatar_path like id::text||'/%');
grant update(avatar_path) on public.profiles to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',false,2097152,array['image/jpeg','image/png','image/webp']);
create policy avatar_owner_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and public.is_verified_student() and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatar_owner_delete on storage.objects for delete to authenticated using(bucket_id='avatars' and public.is_verified_student() and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatar_verified_read on storage.objects for select to authenticated using(bucket_id='avatars' and public.is_verified_student() and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.profiles p where p.avatar_path=name and public.can_connect(p.id))));
create function public.activity_counts(post_ids uuid[],activity_ids uuid[]) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'posts',coalesce((select jsonb_object_agg(id,jsonb_build_object('likes',(select count(*) from public.post_likes l where l.post_id=p.id),'comments',(select count(*) from public.comments c where c.post_id=p.id))) from public.posts p where p.id=any(post_ids)),'{}'::jsonb),
 'hangouts',coalesce((select jsonb_object_agg(id,jsonb_build_object('likes',(select count(*) from public.hangout_likes l where l.hangout_id=h.id),'comments',(select count(*) from public.hangout_comments c where c.hangout_id=h.id))) from public.hangouts h where h.id=any(activity_ids)),'{}'::jsonb));
$$;
revoke all on function public.activity_counts(uuid[],uuid[]) from public,anon;
grant execute on function public.activity_counts(uuid[],uuid[]) to authenticated;
create index if not exists notifications_page_idx on public.notifications(recipient_id,created_at desc,id desc);
create index if not exists hangouts_page_idx on public.hangouts(starts_at,id);
create index if not exists comments_page_idx on public.comments(post_id,created_at desc,id desc);
create index if not exists hangout_comments_page_idx on public.hangout_comments(hangout_id,created_at desc,id desc);
commit;
