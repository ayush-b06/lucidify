# Dashboard audit and local fixes

Work was performed in `lucidify-playground`; validation used local Firebase emulators.

## Findings addressed

| Area | Problem | Result |
| --- | --- | --- |
| Notifications | Client-to-admin events required looking up the admin's private profile; project submission and approval events were missing. | Client events live under the actor's `adminNotifications` collection. The admin inbox subscribes to them. Submission, approval, progress, design uploads, billing, messages, and deletion requests produce in-app alerts. |
| Notification reliability | Saves and alerts were separate and failures were swallowed. | Related writes commit atomically. Inbox errors are visible and retryable; failed read acknowledgements keep the alert and its destination available. |
| Notification interface | Clipped panel, weak mobile/keyboard behavior, no filters, and oversized mark-read batches. | Responsive fixed panel, All/Unread filters, persistent read state, accessible controls, Escape support, and batches of at most 450 acknowledgements. |
| Messages | Conversation lists and sidebar badges did not update live. | Support and direct-message threads and unread badges update through Firestore listeners, with cleanup on unmount. |
| Message integrity | Message, preview, unread, and notification writes could partially succeed; concurrent unread increments were lost. | One atomic batch sends the message, updates its preview, increments the recipient counter, and creates its alert. Failed sends retain the draft. |
| Conversation selection | Every client's pinned thread could share the same ID; admin selection collided and notification deep links could repeatedly steal selection. | Admin selection uses both owner and conversation IDs. Deep links apply once, and visible conversations clear unread counts. |
| Direct messages | Creating a thread could overwrite existing messages' metadata or create only one participant reference. Search failures looked like missing users. | Transactional creation preserves existing threads and writes both participant references. Search has explicit errors, bounded queries, and stale-response protection. The pinned support conversation handles contacting Lucidify. |
| Project URLs | Direct URLs required duplicate query parameters and client routes trusted another user's query parameter. | IDs come from the route; client ownership comes from the authenticated account. Admin routes explain how to select an owner when one is missing. |
| Creating projects | Reopening the form after success could leave it permanently busy. | Busy state resets on success and failure. Naming, focus handling, and button copy are clearer. |
| Project setup | Failed saves advanced the wizard; Save & exit did not save; failed uploads could silently disappear. | Steps and exit wait for successful saves. Images validate type/size, upload errors remain visible, and choices stay available for retry. Submitted projects redirect to their overview instead of resetting approval. |
| Project review | The admin could not easily review a pending request or see its setup choices. | Pending projects have a review link. A shared brief displays the idea, audience, visual preferences, content, and optional practical details, with older technical and billing preferences retained when present. |
| Billing schema | Setup wrote payment-preference strings into the numeric instalment-count field. | `requestedPaymentPlan` is separate from the agreed numeric `paymentPlan`. Legacy strings display as preferences and never enter invoice arithmetic. |
| Billing integrity | Invalid numbers and stale payment counters could corrupt totals or count a payment twice. | Shared validated totals clamp paid counts; negative/invalid amounts are rejected. Recording payments and editing billing use transactions and atomic alerts; already-recorded payments prevent overwriting the schedule. |
| Payment controls | Auto-pay and Pay now implied functionality with no payment integration. | Removed the nonfunctional checkout and auto-charge controls. The page clearly directs clients to arrange payments with Lucidify. |
| Project states | Drafts appeared as submitted requests; declined requests appeared pending; malformed status/progress could break cards. | Draft, pending, declined, and approved states display consistently. Progress is bounded and unknown statuses have fallbacks. Cancellation preserves project records and hides cancelled projects from active listings. |
| Profiles | Empty names and failed profile/avatar saves lacked useful feedback. | Required-name validation, associated input labels, save guards, and visible retryable errors. |
| Account deletion | Deleting the profile before deleting authentication could leave a damaged account if reauthentication failed. | An explicitly labelled deletion-request flow preserves the account and atomically alerts the team. Actual deletion remains a team action. |
| Design uploads | Hidden forms remained mounted, failures were silent, and fixed-width fields overflowed phones. | Modal focus handling, visible upload/save errors, success feedback, atomic design alerts, responsive fields, and readable selection controls. |
| Layout and contrast | Excessive sidebar spacing, fake search/attachment controls, unfinished Analytics tabs, and faint text. | Tighter navigation, project search, useful links, removal of unfinished controls, readable secondary text and status colors, and theme-aware modal surfaces. |

## Build-stage and progress follow-up

Stage selection now immediately recalculates the preview: Planning starts at 0%, Designing at 25%, Developing at 50%, Launching at 75%, and Maintaining at 100%. Checked milestones advance progress within the selected build phase; maintenance tasks leave a completed build at 100%. Switching back to a stage preserves its checklist.

Manual percentages remain available and are clearly labelled. Selecting a stage or toggling a milestone restores automatic calculation. Existing manually entered percentages are preserved on load. Shared normalization handles missing/invalid stage IDs, non-finite percentages, and malformed milestone arrays.

The editor distinguishes unsaved previews from published progress. Save commits stage, percentage, milestones, activity, calculation mode, and the client notification together. Failed saves retain the draft; repeat clicks cannot duplicate the notification. A transaction detects changes from another session before overwriting them and offers a reload of the saved version.

Client/admin dashboards, project lists, overviews, and the client progress page subscribe to live project updates. Saved changes appear without reloading. The production rules must permit the admin to write the `progressMode` field (`automatic` or `manual`) along with the existing progress fields.

Three dedicated browser tests cover stage and milestone changes, switching backward, all open project views updating live, reload persistence, save failures and retries, duplicate clicks, conflicting edits, manual percentages, and maintenance completion. Screenshots: `artifacts/progress-admin-saved.png` and `artifacts/progress-client-mobile.png`.

## Friendly onboarding follow-up

Account setup is a single page asking only for a preferred name and one of the existing 24 avatars. There is no photo upload, company questionnaire, or website questionnaire. Existing profile fields are preserved; the profile page handles names without a surname. Account creation and the welcome conversation still commit together and retain answers after failed saves.

Creating a project now opens its brief immediately. Five steps cover the idea and visitors, look and feel, existing content, optional practical details, and review. A rough idea is the only required answer beyond the project name. Budget and timing accept approximate notes, “Help me decide,” “We’ve already discussed this,” or no answer. Setup no longer asks new clients to choose software, payment arrangements, or a maintenance package. Decorative emojis were removed from these onboarding screens.

Continue and Save & exit persist the brief and current step. Back and review edits retain local answers. Optional logo uploads retain retry behavior and can be removed. Submission atomically completes setup and creates one admin notification; repeated submissions do not reset approval. Both project overviews display the brief. Older platform, page, maintenance, logo, deadline, and billing information remains compatible. Timing preferences do not change the agreed due date.

New project fields: `briefVersion: 2`, `setupStep` (0–4), `audience`, `visitorGoal`, `visualDirection`, `inspiration`, `contentReadiness`, `contentLinks`, `mustHaves`, `timelinePreference`, and `additionalNotes`; existing `projectDescription`, `estimatedBudget`, and `logoUrl` fields are reused. Production rules that restrict field names will need to allow these fields for project owners.

Screenshots include `artifacts/account-setup-desktop.png`, `artifacts/setup-mobile-retry.png`, `artifacts/project-brief-look-desktop.png`, `artifacts/project-brief-review-desktop.png`, and `artifacts/project-brief-mobile-dark.png`.

## Dashboard handoff follow-up

The client dashboard puts the project card ahead of statistics and opens project creation directly for new clients. Drafts offer “Continue your brief”; submitted briefs explain the review step; declined requests offer next steps. Progress and billing details appear for approved builds. Payment counts use the shared billing validation and show “To be arranged” when no schedule exists. Dashboard and project empty-state emojis were replaced with simple SVG icons.

Four focused browser checks cover both dashboard roles in both themes, the new create/draft/review/approval handoff, and live progress across all open views. The handoff check adds one test, bringing the suite to 26 tests. Mobile screenshot: `artifacts/dashboard-draft-mobile.png`.

## Landing page follow-up

The embedded dashboard preview explicitly overrides the shared dashboard minimum height, restoring its original 440 px interior on desktop and mobile. The navigation’s gradient button now links to login. The closing call-to-action reuses that button style for the project form, and its secondary link opens signup. Browser checks verified both destinations, the project popup, and the preview height at desktop and mobile widths.

## Verification

- The initial onboarding pass verified **25 Playwright tests** (24 in the full regression run, plus the successful rerun of the account-preservation test after correcting its fixture). They exercise email and emulated Google login/signup, onboarding recovery, both dashboard roles and themes, notification delivery/read persistence/failure recovery, messages and direct messages, project submission/approval, payments, profiles, deletion requests, mobile dialogs, and upload success/failure.
- Tests use the local Firebase Auth and Firestore emulators with synthetic accounts. Cloudinary success/failure is intercepted in the logo and design upload tests; no live uploads are performed.
- Production build and TypeScript checking pass. ESLint has no errors; existing image-optimization advisories and an unused legacy component's hook warning remain.
- Screenshots are in the ignored `artifacts/` directory, including the notification panel in both themes and the mobile design-upload dialog.

## Service configuration to verify before publishing

No production Firebase rules are checked into this repository. The emulator rules are test fixtures and must not be deployed. Before publishing, confirm the deployed rules permit the intended paths while enforcing ownership and admin privileges:

- Clients create their own `users/{uid}/adminNotifications` events; only the team acknowledges those events.
- Admins write project updates and client notifications together.
- Direct-message participants can read their shared thread, atomically create participant references, and send recipient alerts containing `conversationId` and `senderId`. Directory lookup must follow the application's intended profile-visibility policy.
- Profile updates permit the deletion-request timestamp. Deletion requests require a person or trusted backend to complete account and data removal; the UI does not claim immediate deletion.

Real Google OAuth authorization, the Cloudinary upload preset, and deployed rule enforcement still need a deployment-environment check. This pass implements in-app notifications; it does not add email or push delivery or a payment processor.
