import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode, command }) => {
  if (mode === 'e2e' && command !== 'serve')
    throw new Error(
      'E2E authentication is restricted to the local test server. Production builds must use real Firebase.',
    )
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '#activity-service': fileURLToPath(
          new URL(
            mode === 'e2e'
              ? './tests/support/activity.service.ts'
              : './src/features/activities/services/activity.service.ts',
            import.meta.url,
          ),
        ),
        '#auth-service': fileURLToPath(
          new URL(
            mode === 'e2e'
              ? './tests/support/auth.service.ts'
              : './src/features/auth/services/auth.service.ts',
            import.meta.url,
          ),
        ),
      },
    },
  }
})
