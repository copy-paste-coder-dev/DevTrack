import type { PropsWithChildren } from 'react'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '../components/feedback/ErrorBoundary'

export function AppProviders({ children }: PropsWithChildren) {
  return <ErrorBoundary>{children}<Toaster theme="dark" position="bottom-right" richColors closeButton /></ErrorBoundary>
}
