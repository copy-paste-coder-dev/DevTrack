export function getPreferencesErrorMessage(
  cause: unknown,
  operation: 'read' | 'save' = 'save',
): string {
  const code =
    cause && typeof cause === 'object' && 'code' in cause
      ? String(cause.code).replace(/^firestore\//, '')
      : ''
  const messages: Record<string, string> = {
    'permission-denied': "You don't have permission to access these settings.",
    unauthenticated: 'Please sign in again to access your settings.',
    unavailable: 'Settings service is temporarily unavailable. Please try again.',
    'app/offline': 'Check your internet connection and try again.',
    'network-request-failed': 'Check your internet connection and try again.',
  }
  return (
    messages[code] ??
    (operation === 'read'
      ? 'Unable to load your saved preferences.'
      : 'Unable to save settings. Please try again.')
  )
}
