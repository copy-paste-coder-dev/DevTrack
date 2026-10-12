import { FlaskConical } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Brand } from './Brand'
import { mockUser } from '../../mocks/user.mock'

export function TopHeader() {
  return (
    <header className="topbar">
      <span className="topbar-label">
        Personal workspace <span>/</span> DevTrack
      </span>
      <Brand />
      <div className="header-account">
        <NavLink to="/login" className="workspace-status">
          <FlaskConical size={13} />
          <span>
            UI preview <span className="preview-detail">· Changes are not saved</span>
          </span>
        </NavLink>
        <span
          className="avatar mobile-avatar"
          role="img"
          aria-label={`Sample profile: ${mockUser.name}`}
        >
          {mockUser.initials}
        </span>
      </div>
    </header>
  )
}
