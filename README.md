Check this out at [lucidify.vercel.app](https://lucidify.vercel.app)!

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Authentication and dashboard regression tests

The Playwright suite uses the Firebase Auth and Firestore emulators with the
`demo-lucidify` project. It never creates production accounts or writes production
data. Install a supported Java runtime and the Chromium browser, then run:

```bash
npm ci
npx playwright install chromium
npm run test:emulators
```

The suite starts Next.js on port 3001 with
`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`. Ports 8088 and 9098 are used by
Firestore and Auth. Keep that environment flag unset for normal development and
production builds. `tests/firestore.rules` is a local fixture with failure switches
for testing denied reads/writes; it is **not** a production rules file.

Tests cover email and emulated Google signup/login, incomplete setup recovery,
new tabs, optional steps, failed atomic saves and retries, duplicate submission,
profile-read failures, and dashboard navigation in both themes. Screenshots are
written to the ignored `artifacts/` directory. Real Google OAuth configuration and
deployed Firestore rules still require verification against the deployed project.

## Client project and messaging workflows

The client dashboard and project list subscribe to project updates in real time.
Clients can search/filter projects, resume incomplete briefs from “Your next
steps,” and read submitted briefs while requests are pending or declined. Project
URLs use the path ID and the signed-in client's identity; admin links retain the
client's `userId` query parameter. Firebase rules remain the authorization boundary.

Project setup persists answers and the current `setupStep` with **Save & exit**.
Failed saves keep the form open with a retry message. The `setupStep` field is
optional, and approved legacy projects do not require `setupComplete` to exist.

Messages keep separate drafts per account and conversation in the current tab's
session storage. Drafts survive navigation and reload; closing the tab clears them.
Message records, previews, timestamps, and unread increments are committed in a
single Firestore batch. Conversations update live, and mobile chats are marked
read only when opened. “Ask the team” includes the selected project's name in the
message so the team has context.

`tests/client-workflows.spec.ts` exercises project creation and submission,
save/retry/resume, legacy statuses, route ownership, live updates, draft recovery,
atomic send failure, mobile unread behavior, direct messages, and admin reply
counts. The emulator ports (8088/9098) are separate from the playground defaults.
