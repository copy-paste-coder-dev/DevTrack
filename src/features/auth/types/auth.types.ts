export interface AuthUser {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
}

export interface SignInResult {
  profileSyncFailed: boolean
}

export interface AuthService {
  subscribeToAuthState: (
    onUser: (user: AuthUser | null) => void,
    onError: (error: unknown) => void,
  ) => () => void
  signInWithGoogle: () => Promise<SignInResult>
  signOutUser: () => Promise<void>
}
