import { Code2, LogIn, LogOut } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { toast } from 'sonner'
import { Brand } from './Brand'
import { NavigationLinks } from './NavigationLinks'
import { mockUser } from '../../mocks/user.mock'
import { Button } from '../ui/Button'

export function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink to="/app" className="brand-link" aria-label="DevTrack home">
        <Brand />
      </NavLink>
      <p className="nav-label">WORKSPACE</p>
      <NavigationLinks />
      <div className="sidebar-bottom">
        <div className="workspace-note">
          <Code2 size={18} />
          <span>Built for your flow.</span>
        </div>
        <NavLink to="/login" className="login-preview-link">
          <LogIn size={16} />
          Open sign-in preview
        </NavLink>
        <div className="profile">
          <span className="avatar">{mockUser.initials}</span>
          <div>
            <strong>{mockUser.name}</strong>
            <span>{mockUser.email}</span>
          </div>
          <span className="online-dot" />
        </div>
        <Button
          className="logout-placeholder"
          variant="ghost"
          onClick={() =>
            toast.info('Logout will be connected in Phase 2', {
              description: 'This sample workspace has no signed-in account.',
            })
          }
        >
          <LogOut size={16} />
          Logout
        </Button>
      </div>
    </aside>
  )
}
