import { useState } from 'react'
import { getUserDisplayName, getUserInitials } from '../utils/userMapper'

interface UserAvatarProps {
  displayName: string | null
  email: string | null
  photoURL: string | null
  size?: 'small' | 'medium'
}
export function UserAvatar({ displayName, email, photoURL, size = 'medium' }: UserAvatarProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const showImage = photoURL && photoURL !== failedImage && /^https?:\/\//i.test(photoURL)
  return (
    <span
      className={`avatar user-avatar user-avatar-${size}`}
      role="img"
      aria-label={`${getUserDisplayName(displayName)} profile`}
    >
      {showImage ? (
        <img
          src={photoURL}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailedImage(photoURL)}
        />
      ) : (
        getUserInitials(displayName, email)
      )}
    </span>
  )
}
