import { LockKeyhole } from 'lucide-react'
import { Brand } from './Brand'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { UserAvatar } from '../../features/auth/components/UserAvatar'
import { LogoutButton } from '../../features/auth/components/LogoutButton'
import { getUserDisplayName } from '../../features/auth/utils/userMapper'

export function TopHeader() {
  const { user } = useAuth()
  return (
    <header className="topbar">
      <span className="topbar-label">
        Personal workspace <span>/</span> DevTrack
      </span>
      <Brand />
      <div className="header-account">
        <span className="workspace-status">
          <LockKeyhole size={13} />
          <span>Your personal workspace</span>
        </span>
        <details
          className="account-menu"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.currentTarget.removeAttribute('open')
              event.currentTarget.querySelector('summary')?.focus()
            }
          }}
        >
          <summary aria-label="Open account menu">
            <UserAvatar
              displayName={user?.displayName ?? null}
              email={user?.email ?? null}
              photoURL={user?.photoURL ?? null}
              size="small"
            />
          </summary>
          <div className="account-menu-panel">
            <strong>{getUserDisplayName(user?.displayName ?? null)}</strong>
            <span>{user?.email ?? 'No email available'}</span>
            <LogoutButton />
          </div>
        </details>
      </div>
    </header>
  )
}
