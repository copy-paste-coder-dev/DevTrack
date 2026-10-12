import { Brand } from '../../../components/layout/Brand'
import { LoadingIndicator } from '../../../components/ui/LoadingIndicator'

export function AuthLoadingScreen() {
  return (
    <main className="auth-loading-screen" aria-busy="true">
      <Brand />
      <LoadingIndicator label="Restoring your session…" />
    </main>
  )
}
