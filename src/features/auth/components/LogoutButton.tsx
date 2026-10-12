import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage } from '../utils/authError'

export function LogoutButton({ className = '' }: { className?: string }) {
  const { logout, isSigningOut } = useAuth()
  return (
    <Button
      variant="ghost"
      className={className}
      loading={isSigningOut}
      onClick={async () => {
        try {
          await logout()
          toast.success('Signed out successfully')
        } catch (error) {
          toast.error(getAuthErrorMessage(error, 'sign-out'))
        }
      }}
    >
      {!isSigningOut && <LogOut size={16} />}
      {isSigningOut ? 'Signing out…' : 'Logout'}
    </Button>
  )
}
