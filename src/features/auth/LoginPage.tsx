import { ArrowLeft, ArrowRight, Code2, GitBranch, Mail, Terminal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Brand } from '../../components/layout/Brand'
import { Button } from '../../components/ui/Button'

export function LoginPage() {
  function previewLogin() {
    toast.info('Sign-in arrives in Phase 2', {
      description: 'You can explore the sample workspace without signing in.',
    })
  }
  return (
    <main className="login-page">
      <Link to="/app" className="login-back">
        <ArrowLeft size={15} />
        Back to workspace
      </Link>
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
          <span className="sample-badge">SIGN-IN PREVIEW</span>
          <h1 className="login-title">Welcome to your flow.</h1>
          <p>A clearer day starts here.</p>
          <div className="login-buttons">
            <Button variant="secondary" onClick={previewLogin}>
              <span className="google-mark">G</span>Continue with Google
            </Button>
            <Button variant="secondary" onClick={previewLogin}>
              <GitBranch size={19} />
              Continue with GitHub
            </Button>
            <div className="login-divider">
              <span />
              or
              <span />
            </div>
            <Button variant="secondary" onClick={previewLogin}>
              <Mail size={18} />
              Continue with email
            </Button>
          </div>
          <Link className="button button-primary explore-button" to="/app">
            Explore sample workspace
            <ArrowRight size={17} />
          </Link>
          <p className="login-caption">
            Authentication will be connected in Phase 2.
            <br />
            No account needed for this preview.
          </p>
          <p className="login-security-note">Preview only. No credentials are collected or sent.</p>
          <span className="login-tagline">Track your work. Improve your day.</span>
        </section>
      </div>
    </main>
  )
}
