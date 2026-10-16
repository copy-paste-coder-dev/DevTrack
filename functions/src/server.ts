import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { createEodHttpServer } from './httpApp.js'
import { renderConfiguration } from './renderConfig.js'

const config = renderConfiguration(process.env)
// Explicit project ID is sufficient for public-key ID-token verification. No Firestore/Admin writes.
const auth = getAuth(initializeApp({ projectId: config.projectId }))
const server = createEodHttpServer({
  ...config,
  verifyToken: async (token) => (await auth.verifyIdToken(token)).uid,
})
server.listen(config.port, '0.0.0.0', () =>
  console.info(`EOD backend listening on port ${config.port}`),
)
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 25000).unref()
  })
}
