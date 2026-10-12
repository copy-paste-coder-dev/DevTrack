import { useState } from 'react'
import { Code2, GitBranch, Mail, Terminal } from 'lucide-react'
import { toast } from 'sonner'
import { Brand } from '../../components/layout/Brand'
import { Button } from '../../components/ui/Button'
import { useAuth } from './hooks/useAuth'
import { getAuthErrorMessage } from './utils/authError'

export function LoginPage() {
  const { signInWithGoogle, isSigningIn, initializationError, retryInitialization } = useAuth()
  const [error, setError] = useState<string | null>(null)
  async function signIn() {
    setError(null)
    try {
      const result = await signInWithGoogle()
      if (result.profileSyncFailed)
        toast.warning("Signed in successfully, but we couldn't sync your profile.")
      else toast.success('Signed in successfully')
    } catch (cause) {
      const message = getAuthErrorMessage(cause)
      setError(message)
      toast.error('Could not sign in', { description: message })
    }
  }
  return (
    <main className="login-page">
      <div className="login-layout">
        <section className="login-story">
          <Brand />
          <div>
            <span className="eyebrow">LESS FRICTION. MORE FLOW.</span>
            <h2 className="login-story-title">
              Your work deserves
              <br />a little <span>clarity.</span>
            </h2>
            <p>
              A simple home for your development day.
              <br />
              Log your work, find your rhythm, and keep building.
            </p>
          </div>
          <div className="code-window" aria-hidden="true">
            <div className="code-window-bar">
              <span />
              <span />
              <span />
              <i>your-day.ts</i>
              <Terminal size={14} />
            </div>
            <div className="code-lines">
              <p>
                <em>const</em> day = {'{'}
              </p>
              <p className="code-indent">
                focus: <span>'one thing at a time'</span>,
              </p>
              <p className="code-indent">
                progress: <span>'small steps, daily'</span>,
              </p>
              <p className="code-indent">
                possibilities: <b>Infinity</b>
              </p>
              <p>{'}'};</p>
              <p className="code-comment">// Make room for meaningful work.</p>
              <p>
                <b>build</b>(day);
                <span className="code-cursor" />
              </p>
            </div>
            <div className="code-window-footer">
              <Code2 size={14} />
              <span>Log. Focus. Build.</span>
              <span className="online-dot" />
            </div>
          </div>
          <span className="login-story-footer">BUILT FOR DEVELOPERS. DESIGNED FOR FOCUS.</span>
        </section>
        <section className="login-panel">
          <span className="login-brand">
            <Brand />
          </span>
          <span className="sample-badge">YOUR DEVTRACK ACCOUNT</span>
          <h1 className="login-title">Welcome to your flow.</h1>
          <p>A clearer day starts here.</p>
          <div className="login-buttons">
            <Button
              variant="secondary"
              onClick={signIn}
              loading={isSigningIn}
              disabled={Boolean(initializationError)}
            >
              {!isSigningIn && (
                <span className="google-mark" aria-hidden="true">
                  G
                </span>
              )}
              {isSigningIn ? 'Signing in…' : 'Continue with Google'}
            </Button>
            <Button variant="secondary" disabled>
              <GitBranch size={19} />
              Continue with GitHub
              <span className="auth-soon">Soon</span>
            </Button>
            <div className="login-divider">
              <span />
              or
              <span />
            </div>
            <Button variant="secondary" disabled>
              <Mail size={18} />
              Continue with email
              <span className="auth-soon">Soon</span>
            </Button>
          </div>
          {(error || initializationError) && (
            <div className="auth-error" role="alert">
              <p>{error || initializationError}</p>
              {initializationError && (
                <Button variant="secondary" onClick={retryInitialization}>
                  Try again
                </Button>
              )}
            </div>
          )}
          <p className="login-caption">Sign in to your personal developer workspace.</p>
          <p className="login-security-note">
            Google manages your sign-in. DevTrack never sees your Google password.
          </p>
          <span className="login-tagline">Track your work. Improve your day.</span>
        </section>
      </div>
    </main>
  )
}
