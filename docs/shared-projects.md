# Shared project access

Admins and existing clients can add another Lucidify member from **Project overview → Project clients → Add client**. Search uses first/last-name prefixes, ignores case and accents, and displays the matching member's email. Email addresses are not indexed for search. The 20-result search page is not a project membership limit; refine the name to narrow results.

Each project retains its original `users/{ownerId}/projects/{projectId}` document and resource collections. Adding a client atomically creates a member document under that project and a `users/{memberId}/sharedProjects/{ownerId}_{projectId}` reference. No project, billing, or upload data is copied. Existing projects work without a project migration. Membership uses separate documents rather than an array with a fixed size cap.

Clients subscribe to their own projects and to the original documents referenced by their shared entries. Admins subscribe only to original project collections, so a shared project appears once. Links carry the original owner's ID. Database rules enforce membership regardless of the URL and require both membership records in the same transaction. Member records cannot be retargeted or self-created by outsiders. Removing members is outside this feature's scope.

Members inherit client access to the project and its files, can add more clients, and can edit the project name and description. Billing and progress controls remain on the admin UI. Detail edits update only changed fields and reject conflicting edits to the same field. Live subscriptions update project lists, details, payment summaries, members, and uploads.

## Rollout

1. Deploy `firebase/firestore.rules` with `firebase deploy --only firestore:rules --project lucidify-playground` before publishing the application changes.
2. Backfill existing directory entries' display emails using `node scripts/sync-member-directory.cjs --repair-email` to preview, then add `--apply` to write. If Firebase CLI is not on PATH, pass `--firebase-tools /path/to/node_modules/firebase-tools`. This reads email from each existing profile; it does not add email search terms or modify private profiles. Logged-in members also refresh their directory entry automatically.
3. Publish the application through the normal deployment workflow.

The feature exposes directory emails to signed-in Lucidify members, alongside existing names and avatars. Private user profiles remain restricted to their owner and the admin.

## Verification

`npm run test:emulators` runs local tests only. `tests/project-members.spec.ts` installs the production rules temporarily and verifies admin/client additions, a new member adding another client, live project-list insertion, live detail changes and uploads across three sessions, stale-edit protection, reload/navigation, name-only search with email display, mobile layout, outsider and partial-write rejection, and a roster exceeding 20 clients.
