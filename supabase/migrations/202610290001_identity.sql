begin;
create schema if not exists private;
revoke all on schema private from public;
create table private.approved_email_domains (
 domain text primary key check(domain = lower(domain) and domain not like '%@%' and length(domain) > 3)
);
alter table private.approved_email_domains enable row level security;
revoke all on private.approved_email_domains from public, anon, authenticated;
-- Intentionally empty: the university must supply its approved domain(s).
create function private.enforce_campus_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from private.approved_email_domains d where d.domain = lower(split_part(new.email, '@', 2))) then
  raise exception 'Use an approved university email address.';
 end if;
 return new;
end;
$$;
create trigger enforce_campus_email before insert or update of email on auth.users
for each row execute function private.enforce_campus_email();

create function public.is_verified_student() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from auth.users u join private.approved_email_domains d
 on d.domain = lower(split_part(u.email, '@', 2))
 where u.id = auth.uid() and u.email_confirmed_at is not null
 and (u.banned_until is null or u.banned_until < now()));
$$;
revoke all on function public.is_verified_student() from public;
grant execute on function public.is_verified_student() to authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(char_length(btrim(display_name)) between 2 and 60),
 program text not null default '' check(char_length(program)<=100),
 bio text not null default '' check(char_length(bio)<=300),
 interests text[] not null default '{}',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint interest_count check(cardinality(interests)<=10)
);
create function private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare student_name text;
begin
 student_name := btrim(coalesce(new.raw_user_meta_data->>'display_name', 'Campus friend'));
 if char_length(student_name) not between 2 and 60 then student_name := 'Campus friend'; end if;
 insert into public.profiles(id,display_name) values(new.id,student_name);
 return new;
end;
$$;
create trigger create_student_profile after insert on auth.users
for each row execute function private.create_profile();
create function private.validate_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
 if exists(select 1 from unnest(new.interests) i where i is null or char_length(btrim(i)) not between 1 and 30) then
  raise exception 'Interests must contain 1–30 characters.';
 end if;
 new.updated_at := now();
 return new;
end;
$$;
create trigger validate_student_profile before update on public.profiles
for each row execute function private.validate_profile();
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(display_name,program,bio,interests) on public.profiles to authenticated;
create policy verified_profile_read on public.profiles for select to authenticated
using(public.is_verified_student());
create policy owner_profile_update on public.profiles for update to authenticated
using(id = (select auth.uid()) and public.is_verified_student())
with check(id = (select auth.uid()) and public.is_verified_student());
revoke all on function private.enforce_campus_email() from public;
revoke all on function private.create_profile() from public;
revoke all on function private.validate_profile() from public;
commit;
