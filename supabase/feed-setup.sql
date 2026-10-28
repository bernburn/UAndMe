begin;
create table public.posts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null constraint posts_author_id_fkey references public.profiles(id) on delete cascade,
 content text not null check(char_length(btrim(content)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index posts_chronology_idx on public.posts(created_at desc);
create index posts_author_idx on public.posts(author_id);
alter table public.posts enable row level security;
revoke all on public.posts from public, anon, authenticated;
grant select, delete on public.posts to authenticated;
grant insert(author_id,content) on public.posts to authenticated;
create policy verified_posts_read on public.posts for select to authenticated
 using(public.is_verified_student());
create policy owner_posts_create on public.posts for insert to authenticated
 with check(author_id=(select auth.uid()) and public.is_verified_student());
create policy owner_posts_delete on public.posts for delete to authenticated
 using(author_id=(select auth.uid()) and public.is_verified_student());
commit;
