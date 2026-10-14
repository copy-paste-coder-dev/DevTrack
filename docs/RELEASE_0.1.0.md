# DevTrack 0.1.0 deployment record

Published candidate: [https://dev-track-46323.web.app](https://dev-track-46323.web.app).

The user explicitly selected `dev-track-46323` for the MVP release on October 14, 2026. The existing development project is intentionally also the release project. Auth/Firestore data are shared between those environments. No existing user data was modified during deployment or verification.

## Published resources

| Resource                   | Evidence                                                           |
| -------------------------- | ------------------------------------------------------------------ |
| Firebase project/site      | `dev-track-46323`                                                  |
| App version                | `0.1.0` release candidate                                          |
| Hosting version            | `445a97bd8998d7cd`, FINALIZED                                      |
| Hosting release            | `1791943819627000`                                                 |
| Hosting release time       | October 14, 2026, 02:10:19 UTC / 07:40:19 IST                      |
| Firestore ruleset          | `15c5a1b6-036f-4485-a8e8-6d174ea0a17c`                             |
| Released rules SHA-256     | `a49551c93ae1c82e517e925a8dd3b38e080a84c4f7bb518eacb2172bbb9cebeb` |
| Required activity index    | `dateKey ASC, startAt ASC`, collection scope, READY                |
| Google provider            | Enabled                                                            |
| Authorized Hosting domains | `dev-track-46323.web.app`, `dev-track-46323.firebaseapp.com`       |

All six Vite Firebase web settings were checked against the registered web app, and an explicit ignored `.env.production.local` was created. `.firebaserc` records development/production aliases to the user-selected project without a default target. Deployment commands used explicit project arguments:

```sh
firebase deploy --only firestore:rules,firestore:indexes --project dev-track-46323 --non-interactive
firebase deploy --only hosting --project dev-track-46323 --message "DevTrack MVP v0.1.0 release candidate" --non-interactive
```

Released rules were independently read back and match reviewed source. The index was READY before publication and remains READY. Domain configuration already included both Hosting hostnames; no additional auth permissions were introduced.

## Verification

- Production build passes; the fresh local production-preview suite passed 3/3 before publication.
- Public deployment suite passed **4/4**, with zero unexpected/flaky/skipped results.
- Every deployed JS/CSS asset matches the local candidate's SHA-256; SPA HTML also matches exactly.
- Direct entry/reload of `/`, `/login`, `/app`, `/app/calendar` and `/app/settings` works at 390px and 1440px. Guests remain at Login, and the unknown-route page renders correctly.
- Published security headers and HTML/immutable-asset cache policies match configuration; Login accessibility scans pass without page/console errors.
- Ten actual unauthenticated Firestore profile/settings/activity/unlisted requests, including attempted writes to a unique disposable probe path, were denied with rule-level PERMISSION_DENIED responses. No writes succeeded.
- **48/48 released-rules request-context simulations** pass for owner/other UID/guest access and malformed writes. These simulate contexts against the deployed rules; they are not real Google logins or data mutations. See [Firebase's Rules API testing guidance](https://firebase.google.com/docs/rules/manage-deploy).
- Read-only privileged inspection corroborates a Google-provider profile login audit at 02:11:01 UTC after publication, valid saved preferences and five valid current-month activities for the account matching the CLI login. This does not identify the browser origin or prove new CRUD/settings/session interactions. Only metadata/aggregate validation results are saved in `artifacts/phase8-live-data-result.json`; user content/tokens are not included.

The local Hosting emulator denies `/.env` with 404. Public Hosting rewrites that unknown path to exactly the SPA HTML. The deployed test checks the actual response contents, rather than treating a safe fallback as exposed environment data. Only `dist` is uploaded; actual environment files stay ignored and outside that directory.

Repeat the public checks with:

```sh
npm run test:deployed -- --workers=1
```

These checks target only the authorized project. They do not sign in or modify existing users' data. Prior 58-unit / 48-emulator / 76-synthetic-browser results are recorded in the [Phase 8 report](PHASE_8_REPORT.md).

## Recovery and source record

Ignored local evidence includes `artifacts/phase8-release-before.json`, `phase8-release-after.json`, `phase8-release-manifest.json`, `phase8-mvp-v0.1.0-dist.zip`, deployment logs, `phase8-deployment.json` and `phase8-released-rules-result.json`.

The build archive contains only the served `dist` directory; the manifest records hashes for the build and source/configuration without copying private environment values. This was the site's first Hosting release, so there is no earlier live Hosting version to restore. Preserve this archived candidate as a recovery point for future changes. Review any backend rules rollback separately.

The candidate includes preserved uncommitted Phase 6/7/8 work. No Git commit, version tag or push was created, so the existing HEAD is not mislabeled as containing this release. Finalize the source checkpoint after review and acceptance.

## Outstanding acceptance

1. Real Google sign-in, settings save/refresh, CRUD/smart-time/gaps/duplicate, multi-date Calendar, mobile interaction, logout/re-login and persistence on the published origin.
2. Two real Google accounts verifying isolated profile, activities, settings, recents and Calendar data.

Browser connectors are unavailable for both the in-app browser and Chrome in this session. Complete signed-in acceptance results are not yet recorded. Deployment and automated verification are complete; these two acceptance checks remain open.

PHASE 8 STATUS: INCOMPLETE
