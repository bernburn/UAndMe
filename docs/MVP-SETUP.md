# MVP upgrade and verification

## Existing project

For hangout-post interactions, run `supabase/hangout-interactions.sql` once **after** the MVP upgrade. This adds persistent hangout likes/comments and an organizer-only deletion function, with RLS and verified-account/block checks. Comment notifications go to the organizer; deleting an activity notifies pending/confirmed participants. The trash button asks for confirmation before removing the activity, reactions and comments. Regular post and hangout comment threads use separate keys. Do not rerun the MVP upgrade to add these interactions.

The identity/profile setup has already been applied. Run **supabase/mvp-upgrade.sql once** in the Supabase SQL Editor. It creates posts if the earlier feed setup was skipped, then adds likes, comments, hangouts, requests, notifications, reports, blocks and private moderator assignments. Do not rerun setup.sql or feed-setup.sql. An unsuccessful MVP transaction rolls back; after a successful run, do not run it again.

## New project

Apply migrations 001, 002, 003 and 004 in filename order. Configure email confirmation, SMTP, redirect origins, and the public frontend environment values as described in README.md. Keep email confirmation enabled. Add `http://127.0.0.1:5175` to allowed redirect URLs while using the current preview.

## Grant a moderator

Use the SQL Editor as project owner. Substitute the verified student's real profile UUID, obtained from Authentication → Users:

```sql
insert into private.moderators(user_id) values ('VERIFIED-USER-UUID');
```

Never grant roles through user-editable profile or signup metadata. Reload the app after assigning a moderator. Administrators must still have a verified approved campus account. The moderation screen can resolve reports, delete posts and remove hangout content/cancel the activity. Account bans are administered through Supabase Authentication; banned accounts lose application access.

## Automated database checks

Run `npm run test:db` for isolated PostgreSQL checks using PGlite and a minimal Supabase Auth schema shim. These checks passed locally, including all four migrations and the existing-project upgrade when feed setup was skipped. They never connect to your Supabase project.

In a disposable development Supabase database, you can also run `supabase/tests/mvp_workflows.sql` after the migrations. It creates three test identities in a transaction, asserts self-request rejection, duplicate request rejection, organizer authorization, capacity limits, like/unlike, comments, notifications, blocking, moderator authorization/removal, profile ownership and notification privacy, then rolls all fixtures back. Local checks do not exercise Supabase's email service or concurrent transactions; hosted acceptance and parallel-session approval testing remain necessary.

## End-to-end acceptance

1. Register two campus test students, verify their emails in the same browser where registration started, then save profiles. Both should reach the feed; refresh and sign in again to check persistence.
2. Student A publishes a post; B likes/unlikes it and comments. A receives a notification. Only A can delete the post. Check the same restrictions through direct API calls.
3. A creates a future Games hangout with capacity two. B requests a slot. A approves; both see organizer plus B in the participant list. A third student's approval must fail when full, including when two approval requests race. Pending requests never reserve slots.
4. B leaves and can request again. A edits the activity and cannot shrink capacity below confirmed attendance. A cancels; pending/approved users receive a notification. Past and cancelled activities appear under the history filter.
5. B reports A's post, activity or account. A privately assigned moderator reviews and resolves reports or removes content. Students cannot access reports or execute moderator actions.
6. B blocks A; A's posts/profile/hangouts disappear for B and B cannot interact with A's content. Unblocking restores visibility. Confirm unread/read notification states persist after refresh.
7. Verify navigation, modal keyboard controls, validation, errors, empty states and narrow/mobile layouts.

## Scope and limits

Home refresh is user-controlled: visible-tab checks read recent IDs every 30 seconds and on focus/reconnect, then show a new-updates prompt without inserting items. Clicking the prompt, tapping Home again, or pulling down from the top of the mobile Home feed loads new items. Local reactions refresh existing content without introducing other students' pending new items. Drafts remain in state. Mobile gestures exclude form controls and open dialogs and have a release threshold to prevent accidental refreshes. No realtime publication or SQL change is required. Build and 35 unit tests pass; touch behavior still needs testing on a physical phone.

Names and avatars open full student profile pages at `#profile/<student UUID>`, including post/comment authors and hangout organizers. Browser Back/Forward restores the selected profile or campus section. Profiles load their own posts and activities rather than relying on the feed's current page. Only the owner sees edit controls and their blocked-account list; other profiles offer reporting and blocking. Profile queries continue to use existing RLS/block restrictions. No migration is needed for this navigation update.

The Home feed mixes text posts and hangout announcements by creation time (newest first), with deterministic ordering for matching timestamps. Cards show the organizer, category, description, campus location, Manila start time, confirmed count and remaining slots. Pending requests do not use slots. Past, completed and cancelled activities remain visible with status labels. View hangout opens the existing details and request controls. This uses existing tables and requires no new migration.

Explore creation fix: saving an activity now reads back the exact saved ID, merges it into the visible list, and resets stale search/category/date filters. Read-back failures explicitly distinguish a saved activity from a failed creation. The history switch includes history alongside upcoming activities. The browser was checked against the real Study Session activity and its organizer detail controls. Tests also cover Manila date filtering and creator/verified-student read access. This frontend change needs no new migration.

Implemented screens use live Supabase data, with no seeded campus content or login bypass. Private profile image uploads are included in migration 006; see PHOTOS-AND-PAGINATION.md. Email sending depends on your SMTP/provider configuration. Reports on accounts require an administrator to assess and apply bans in Supabase. Explore, notifications, joined activities and comments now use server-side pages. The main feed bootstrap and participant directory still use bounded queries; very large campus directories and participant rosters need further scaling work. Do not represent local build success as proof that remote database permissions or email delivery have passed acceptance.

