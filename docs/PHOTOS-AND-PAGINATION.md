# Profile photos, joined history and pagination

## Apply to your existing project

Run **supabase/photos-pagination.sql once** in Supabase SQL Editor. This requires the earlier MVP and hangout-interactions migrations. Do not rerun previous setup files. New projects apply all numbered migrations in order.

The migration adds private avatar storage, a profile-photo path, a separate onboarding-completion timestamp, full interaction counts and list indexes. No secret storage key is placed in the frontend. Avatars use expiring signed URLs; the image-upload API checks the current student's folder and verified account. The application accepts JPEG, PNG and WebP up to 2 MB, uses unique filenames, and supports replacement/removal. Existing linked signed URLs may remain usable until they expire; the bucket itself is private.

## Features

- Edit profile → Upload profile photo. Changes are saved immediately; saving the rest of the profile still returns to Home. Photos appear in feeds, profile pages, the account rail and comments. Initials remain the fallback.
- Full profile pages show **Joined hangouts**, paged in batches of 20, containing approved activities including past, completed and cancelled hangouts. Withdrawn requests are excluded; created activities remain separate.
- Explore searches and filters on the server before paging. Changing filters resets the list. **Load more hangouts** fetches the next batch of 20.
- Notifications load 20 at a time, with **Load older notifications**. Marking an older item as read keeps the loaded list intact. The unread indicator uses a full count.
- Comments load only when their thread is opened, 20 at a time, newest first. **Load older comments** fetches additional replies. Post/hangout counts are server aggregates rather than counts of the currently loaded comment page.
- Requests keep stable timestamp/ID ordering, reject stale responses after filter changes and deduplicate records between pages. These are offset pages; rapid concurrent deletion/insertion can shift offsets, so reload a list to reconcile it.

## Verification

Run `npm run build`, `npm test`, and `npm run test:db`. The database harness simulates Supabase Auth/Storage schemas in local PostgreSQL; it checks owner-only object creation, linked-avatar visibility, blocked visibility, onboarding, more than 20 notifications and comment totals beyond the first page. It does not test Supabase's live Storage HTTP service. After applying the migration, upload/replace/remove a real test image and check it from a second verified account. Test physical-phone file selection and lists containing over 20 items before deployment.

## GitHub

Commit source, numbered migrations, docs, `.env.example`, package files and `.gitignore`. Do not upload `.env.local`, `node_modules`, `dist`, or local screenshots. `.gitignore` excludes those development files. Set public Supabase environment values separately when deploying. Keep service-role keys, SMTP credentials and database passwords out of the repository.
