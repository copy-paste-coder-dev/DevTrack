import { Code2 } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Brand } from './Brand'
import { NavigationLinks } from './NavigationLinks'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { UserAvatar } from '../../features/auth/components/UserAvatar'
import { LogoutButton } from '../../features/auth/components/LogoutButton'
import { getUserDisplayName } from '../../features/auth/utils/userMapper'

export function Sidebar() {
  const { user } = useAuth()
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
        <div className="profile">
          <UserAvatar
            displayName={user?.displayName ?? null}
            email={user?.email ?? null}
            photoURL={user?.photoURL ?? null}
          />
          <div>
            <strong>{getUserDisplayName(user?.displayName ?? null)}</strong>
            <span>{user?.email ?? 'No email available'}</span>
          </div>
          <span className="online-dot" />
        </div>
        <LogoutButton className="logout-placeholder" />
      </div>
    </aside>
  )
}
