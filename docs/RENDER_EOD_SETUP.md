# EOD AI on Render Free

Prepared October 16, 2026. The HTTP backend and frontend transport are implemented. A Render service URL and signed-in production acceptance are still pending. Firebase Hosting, Authentication and Firestore stay on `dev-track-46323`; no Firebase billing change is needed for this backend.

## 1. Publish the source and connect the repository

Render needs a Git revision containing `render.yaml`, the complete `functions/` package and its lockfile. The repository is `copy-paste-coder-dev/DevTrack` on GitHub. Review and publish the candidate source to the branch you intend to deploy. Local uncommitted files are not available to Render.

In the Render dashboard, choose **New → Blueprint**, connect GitHub, authorize access to this repository and select that published branch. Render reads the root `render.yaml`. Review the proposed `devtrack-eod-ai` web service and confirm its plan is **Free** before creating it. Automatic deployments are disabled in the blueprint; deploy later revisions manually.

If creating a Web Service manually instead, use:

| Setting        | Value                                   |
| -------------- | --------------------------------------- |
| Runtime        | Node                                    |
| Root directory | `functions`                             |
| Build command  | `npm ci --include=dev && npm run build` |
| Start command  | `npm start`                             |
| Health check   | `/health`                               |
| Instance plan  | Free                                    |

The package selects Node 22. The server binds to `0.0.0.0` and Render's `PORT` (default 10000). No persistent disk, database, service-account file or Firebase Functions deployment is required.

## 2. Configure the backend environment

The blueprint supplies all non-secret settings:

```dotenv
NODE_ENV=production
FIREBASE_PROJECT_ID=dev-track-46323
ALLOWED_ORIGINS=https://dev-track-46323.web.app,https://dev-track-46323.firebaseapp.com
EOD_AI_PROVIDERS=groq,gemini
GROQ_MODEL=openai/gpt-oss-20b
GEMINI_MODEL=gemini-3.5-flash-lite
```

When prompted for `EOD_AI_KEYS`, enter a JSON object containing both existing provider keys:

```json
{ "groq": "YOUR_GROQ_KEY", "gemini": "YOUR_GEMINI_KEY" }
```

Use the values already stored in ignored `functions/.secret.local`. In Render enter only the JSON value, without `EOD_AI_KEYS=` or surrounding shell single quotes. Keep this value in Render's environment settings; never put it in Git, a `VITE_*` variable or chat. Do not upload `.secret.local` as an asset. Missing configuration for an enabled provider deliberately fails startup with a generic configuration message.

## 3. Deploy and check the backend

Create/deploy the service and wait for its live status. Copy its actual HTTPS origin from Render; the service name is not a guarantee of a particular hostname. Open `https://YOUR-ACTUAL-SERVICE.onrender.com/health` and expect `{"status":"ok"}`. Calling `/providers` without a Firebase bearer token must return HTTP 401. A health response alone does not prove provider credentials or signed-in generation.

Authenticated routes are `GET /providers` and `POST /summary`, with `Authorization: Bearer <Firebase ID token>`. Summary body is `{ "provider": "groq" | "gemini", "input": <grouped EOD facts> }`. The frontend supplies the current user's token automatically. Never bypass authentication to test deployment.

## 4. Connect and publish the frontend

Set the actual backend origin in ignored root `.env.production.local`, alongside the existing Firebase web configuration:

```dotenv
VITE_EOD_AI_BASE_URL=https://YOUR-ACTUAL-SERVICE.onrender.com
```

This is a public URL, not a secret. Use an origin with no path, query, credentials or fragment. Do not use a placeholder in a published build. With the setting blank, the standard EOD summary continues to work and AI is unavailable. Vite embeds the URL at build time, so changing it requires rebuilding and publishing Hosting:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd --prefix functions test
npm.cmd run build
npm.cmd run test:preview -- --workers=1
firebase deploy --only hosting --project dev-track-46323
```

Deploy only Hosting here. The retained Firebase callable entry point is an alternative backend and is not used by the new browser transport.

## 5. Signed-in acceptance

Sign in at the published Firebase site and open a day with logged activities in **EOD Summary → AI Enhanced**. Check that discovery lists Groq and Gemini. Generate with each, waiting at least 30 seconds between requests for the same user. Confirm task names, statuses and times stay intact and Copy Summary works. Check logout, re-login, an empty day, and failure fallback to the standard summary. Do not treat mocked browser tests as live provider or OAuth acceptance.

Render Free services sleep after 15 minutes without inbound traffic and can take about a minute to wake. The browser allows 120 seconds per AI HTTP request and shows a connection notice. Generation is never retried automatically. Provider calls have their own 20-second deadline. Render provides 750 free instance hours per workspace per month, shared by free services; provider quotas apply separately. See [Render Free limitations](https://render.com/docs/free).

## Local development

Copy `functions/.env.example` to ignored `functions/.env.local`; existing ignored `.secret.local` supplies the keys. Then run:

```powershell
npm.cmd --prefix functions run build
npm.cmd --prefix functions run start:local
```

In another terminal set `VITE_EOD_AI_BASE_URL=http://127.0.0.1:10000` in root `.env.development.local` and run `npm.cmd run dev`. Restart Vite after environment changes. The allowed local origins default to port 5173; update `ALLOWED_ORIGINS` if your frontend uses another port. Local HTTP still requires a real Firebase sign-in for the configured project; it rejects Auth emulator configuration.

## Security and operational boundaries

The server uses Firebase Admin to verify token signatures, audience/project, issuer and expiry. It needs no service-account private key for this verification. Token revocation/disabled-user checks are not performed on every request, so an already issued token can remain valid until expiry; see [Firebase token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens). CORS allows only configured exact origins and is supplemental to authentication.

Generation retains strict factual input/output validation, a 96,000-byte HTTP body cap, a 24,000-character domain cap, two concurrent generation slots and a bounded 30-second per-user cooldown. Limits are in memory for one process and reset on restart; they are not a durable quota across instances. Errors contain no provider response, key or token. Requests/results are not persisted by this server. Any Firebase user in the configured project can request enhancement; this is not an owner-account allowlist.

Configuration follows [Render Blueprints](https://render.com/docs/blueprint-spec) and [web service requirements](https://render.com/docs/web-services). Inspect Render deployment logs for build/startup failures without logging environment values or authorization headers.
