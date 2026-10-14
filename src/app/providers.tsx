import type { PropsWithChildren } from 'react'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '../components/feedback/ErrorBoundary'
import { AuthProvider } from '../features/auth/context/AuthProvider'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ErrorBoundary>
      <AuthProvider>{children}</AuthProvider>
      <Toaster
        theme="dark"
        position="bottom-right"
        mobileOffset={{ bottom: 'calc(84px + env(safe-area-inset-bottom))', left: 16, right: 16 }}
        richColors
        closeButton
      />
    </ErrorBoundary>
  )
}
