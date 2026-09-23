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
`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`. Ports 8080 and 9099 are used by
Firestore and Auth. Keep that environment flag unset for normal development and
production builds. `tests/firestore.rules` is a local fixture with failure switches
for testing denied reads/writes; it is **not** a production rules file.

Tests cover email and emulated Google signup/login, incomplete setup recovery,
new tabs, optional steps, failed atomic saves and retries, duplicate submission,
profile-read failures, and dashboard navigation in both themes. Screenshots are
written to the ignored `artifacts/` directory. Real Google OAuth configuration and
deployed Firestore rules still require verification against the deployed project.

The suite also covers live client/admin notifications and messages, direct-message
creation and reopening, project setup/approval, payment recording, profile saves,
deletion requests, and mobile design uploads with simulated Cloudinary failures.
See [the dashboard audit](docs/dashboard-audit.md) for the bug list, fixes, and
service-configuration checks needed before publishing. Test builds use `.next-test`
so they can run alongside the normal local preview.

Shared project membership, name-based client search, and the required rules/email
directory rollout are documented in [shared projects](docs/shared-projects.md).
