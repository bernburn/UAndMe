import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
const db=new PGlite();
try {
 await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz,raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;
 create schema storage;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
 grant usage on schema storage to authenticated;
 grant select,insert,delete on storage.objects to authenticated;
 `);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()){
  await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
  process.stdout.write(`Migration passed: ${file}\n`);
 }
 await db.exec(await readFile('supabase/tests/mvp_workflows.sql','utf8'));
 process.stdout.write('Database workflow and RLS assertions passed; fixtures rolled back.\n');
 await db.exec(await readFile('supabase/tests/hangout_interactions.sql','utf8'));
 process.stdout.write('Hangout likes, comments, notifications and deletion checks passed.\n');
 await db.exec(await readFile('supabase/tests/photos-pagination.sql','utf8'));
 process.stdout.write('Avatar ownership/privacy, pagination and aggregate count checks passed.\n');
 // Verify the bundled existing-project upgrade separately.
 const fresh=new PGlite();
 try{
  await fresh.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
  for(const file of ['202610290001_identity.sql','202610290002_campus_domain.sql'])await fresh.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
  await fresh.exec(await readFile('supabase/mvp-upgrade.sql','utf8'));
  process.stdout.write('Existing-project upgrade passed with missing feed migration.\n');
 }finally{await fresh.close();}
}catch(error){console.error('Database check failed:',error.message);process.exitCode=1;}finally{await db.close();}
