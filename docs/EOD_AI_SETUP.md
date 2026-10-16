# EOD AI provider configuration

Updated October 16, 2026. The user selected both Groq and Gemini for project `dev-track-46323` and requested a free deployment alternative to enabling Firebase billing.

## Completed configuration

| Provider | Selected model          | Live provider check                                            |
| -------- | ----------------------- | -------------------------------------------------------------- |
| Groq     | `openai/gpt-oss-20b`    | HTTP 200; synthetic EOD passes the production output validator |
| Gemini   | `gemini-3.5-flash-lite` | HTTP 200; synthetic EOD passes the production output validator |

Only a small synthetic work item was sent in each check. No personal task names, activity notes or account identity were sent. Gemini's first generation attempt timed out; a model-list request verified the key/model and a subsequent generation passed. The Functions build and all nine existing backend tests also pass.

Models were selected from the current [Groq production catalog](https://console.groq.com/docs/models) and [Gemini catalog](https://ai.google.dev/gemini-api/docs/models). Avoid older Llama IDs for new Groq free/developer usage: see [Groq's deprecation history](https://console.groq.com/docs/deprecations). Availability and free quotas must continue to be checked in each provider account.

Project-scoped, non-secret configuration is in ignored `functions/.env.dev-track-46323`:

```dotenv
EOD_AI_PROVIDERS=groq,gemini
GROQ_MODEL=openai/gpt-oss-20b
GEMINI_MODEL=gemini-3.5-flash-lite
```

Both keys are stored in the verified, ignored `functions/.secret.local` as the existing `EOD_AI_KEYS` JSON contract. Provider key entries were removed from ordinary `functions/.env` after verifying the secret file round trip. `.secret.local` is excluded from Functions upload by the existing `*.local` ignore. Never commit, print, place keys in `VITE_*` values or upload that file as a frontend asset. The ignored secret file is for local configuration/emulation; it is not a deployed secret store.

## Deployment state

The project billing API reports billing disabled. Cloud Secret Manager access returned 403, so no cloud secret was created or overwritten. No Functions/Hosting deployment or billing change was performed for this setup. The currently published app is not yet connected to these provider settings.

The retained Firebase callable backend requires the Blaze plan to deploy; the new Render HTTP backend does not use Functions. See [Firebase's deployment guide](https://firebase.google.com/docs/functions/get-started). Do not enable billing automatically.

## Render backend selected

On October 15 the user initially chose local configuration only. On October 16 the user requested the Render implementation and confirmed that a Render account exists but the Git repository is not connected yet. The HTTP backend, Firebase ID-token verification, frontend fetch transport, Free-plan blueprint and local configuration example are now implemented. See [Render setup](RENDER_EOD_SETUP.md) for the exact deployment and signed-in acceptance steps.

The original Firebase callable exports remain available as an alternative, but the current browser transport uses the public VITE_EOD_AI_BASE_URL HTTP origin. No actual Render URL has been configured for the production build, and no Render or new Hosting deployment is claimed. Connecting/publishing the candidate source, entering the existing keys into Render's environment settings, deploying the service and completing live acceptance remain necessary.

Firebase billing remains disabled. No Cloudflare migration, cloud secret provisioning or billing change was performed. Local provider verification establishes working credentials/models at the time tested; it does not establish production deployment or unlimited free quota. Render and provider limits apply separately.
