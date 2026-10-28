# UAndMe

Your campus. Your people. A University of the Assumption student community.

## Current delivery: MVP implementation, awaiting live acceptance

Profile photos, joined-hangout history and server-paged lists are now implemented. Existing projects must run `supabase/photos-pagination.sql` once after the earlier migrations. See [Photos and pagination](docs/PHOTOS-AND-PAGINATION.md) for setup, behavior, testing and GitHub instructions.

The app now uses a Twitter-inspired campus layout and the UA seal palette: navy, yellow, red and white. The logged-out page is a concise introduction beside an always-visible login form, with a separate registration dialog and explicit email-verification instructions.

Implemented application code and database policies: verified campus accounts, editable profiles, chronological text posts, likes/unlikes, comments, owner deletion, searchable/category/date-filtered hangouts, creation/editing/cancellation, join requests, organizer approval/rejection, withdrawal, confirmed participant lists and capacity enforcement under a database row lock. Also included are private read/unread notifications, content/account reports, blocking/unblocking, and a privately assigned moderator dashboard.

**Existing project:** run `supabase/mvp-upgrade.sql` once in the Supabase SQL Editor. It includes feed setup only when posts is missing. Do not rerun the original identity setup. See `docs/MVP-SETUP.md` for moderator assignment, migration details and acceptance steps.

Verification: production build and 17 unit tests pass. The redesigned login and registration entry point were inspected in the browser. Local PostgreSQL migration, workflow and RLS checks pass with `npm run test:db`; the Auth schema is simulated locally. Live authenticated workflows, concurrent approval testing, and email delivery still require the upgrade and verified test accounts. The MVP must pass those checks before being described as deployment-ready. Password recovery is not included. No login bypasses, synthetic campus posts or automatic moderator grants are present.

## Run locally

Requires Node.js 22 or newer and npm.

1. Run `npm install` from this folder.
2. Copy `.env.example` to `.env.local`.
3. Create a Supabase project. For a new database, run `supabase/setup.sql` in its SQL editor; this combines both migrations and configures the owner-confirmed `ua.edu.ph` domain. Alternatively apply the migrations in order with the Supabase CLI. Do not run both methods against the same database.
4. The second migration already adds `ua.edu.ph`. To approve an additional domain later, use the SQL editor (replace the example):

   ```sql
   insert into private.approved_email_domains(domain) values ('approved-campus.example');
   ```

5. Enable email/password authentication and **Confirm Email**. Disable anonymous sign-ins and unused auth providers. Set the password minimum to 12 characters. Configure production SMTP and test delivery with campus-owned accounts. Never disable confirmation to make a demonstration work.
6. Set Supabase Auth Site URL and allowed redirect URLs to the local origin (`http://127.0.0.1:5175`) and the eventual production origin. Use the same browser for PKCE email verification, since the verifier is stored there. Configure the email template to use Supabase's confirmation URL.
7. Set `VITE_SUPABASE_URL` and the public anon/publishable key in `.env.local`. Never put a service role or secret key in browser variables.
8. Run `npm run dev`. Open the local address. Register using an approved campus mailbox, verify through the delivered email, and sign in.

The approved domain table starts empty: all account creation is rejected until configured. Existing sessions cannot read profile data if confirmation is absent, their domain is removed, or their account is banned. Email changes are also checked by the database trigger.

## Verification

Run `npm test` and `npm run build`. Before deployment, use two real test students to verify:

- Unapproved addresses cannot register; approved addresses receive a verification message.
- An unverified account cannot sign in or read profiles.
- Verified students can edit their own profile and see the saved values after reload.
- Direct requests attempting to edit another student's profile fail or affect zero rows.
- Anonymous profile reads return no records; users cannot change IDs, timestamps, or insert/delete profiles.
- Banned users and removed campus domains lose profile access.
- Verification links work at the production origin.

These integration checks require a configured Supabase instance and email delivery; frontend unit tests do not prove authorization.

## Architecture and schema plan

React + TypeScript + Vite with plain responsive CSS. Supabase owns identities, private emails, email verification and sessions. `profiles` contains only shareable student fields and an internal UUID. University IDs and emails are not exposed through profile queries. Domain configuration resides in a non-exposed `private` schema. Database triggers enforce the allowlist and provision profiles; RLS enforces verified access and ownership. The client only uses public credentials. Dates will be stored as `timestamptz`, displayed through `Intl.DateTimeFormat` with `timeZone: 'Asia/Manila'`.

Planned incremental schema:

| Phase | Tables / constraints |
| --- | --- |
| 2 | posts(author_id, content, created_at); post_likes(post_id, user_id) composite key; comments(post_id, author_id, content, created_at). Index feed chronology and comment foreign keys. Owner-only delete, verified read/write. |
| 3 | hangouts(organizer_id, title, description, category, location, starts_at, capacity, status); join_requests(hangout_id, user_id, status) unique pair. Organizer is the first confirmed participant. An organizer-only approval procedure locks the hangout row before counting participants and approving. Pending requests reserve no slots. Prevent own requests and edits to another organizer's activity. |
| 4 | notifications(recipient_id, type, entity_id, read_at); reports(reporter_id, target, reason, status); user_blocks(blocker_id, blocked_id) unique pair; private moderator assignments. Generate notifications in database transactions; recipients alone read/mark them. Apply block checks throughout discovery and interactions. Moderator roles are never taken from user-editable metadata. |

For subsequent phases, extract feature modules, typed query functions, and reusable form/dialog components as the implementation grows. Do not ship later-phase tables with permissive temporary policies.

## Deployment readiness

`npm run build` creates `dist`, suitable for static hosting such as Vercel or Cloudflare Pages. Provide the two public Vite variables at build time, apply database migration first, set allowed redirects to the deployed origin, and verify SMTP before student access. No Supabase project was provisioned automatically. Until those external settings exist, this code cannot provide working campus accounts. Audit RLS, rate limits, security headers and dependency advisories before a public campus launch. No secrets or synced `sources/` files are included in this application.

References: [Supabase email confirmation](https://supabase.com/docs/guides/auth/general-configuration), [user data management](https://supabase.com/docs/guides/auth/managing-user-data), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).



