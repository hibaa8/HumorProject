# End-to-end tests

Playwright tests covering middleware behavior, the public home page, and the
regression bugs we hit during the auth rework.

## Run

```bash
npm run test:e2e
```

Playwright will automatically start `next dev` on port 3000 if it is not
already running, then execute the tests against `http://localhost:3000`.

For a watch / debug UI:

```bash
npm run test:e2e:ui
```

## What is covered

- `home.spec.ts` — public home page renders and shows the Google sign-in CTA
- `auth-redirect.spec.ts` — middleware:
  - protected pages (`/jokes`, `/dashboard`, `/generate`, `/stats`) redirect to
    `/auth/signin` when logged out
  - protected API routes return `401 JSON` (not HTML)
  - public home page (`/`) is reachable when logged out
  - stale `sb-*` cookies do not crash middleware (regression for the
    `refresh_token_not_found` bug)
- `navbar.spec.ts` — logout is rendered as a `<button>`, not a `<Link>` to
  `/auth/logout` (regression for the prefetch-signs-you-out bug)

## What is not covered (yet)

Tests that require a real Google OAuth session are not automated. To add them:

1. Run the app locally and sign in once
2. Save the storage state with `await context.storageState({ path: "tests/.auth/user.json" })`
3. Reuse via `test.use({ storageState: "tests/.auth/user.json" })`

Then write specs for: voting on a caption, generating from an upload, the
dashboard activity feed, and the stats leaderboard.

## CI

To run on Vercel preview deploys, set `CI=1` and `PLAYWRIGHT_TEST_BASE_URL`
to the preview URL, then run `npm run test:e2e`.
