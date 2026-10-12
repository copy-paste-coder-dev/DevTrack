export function getActivityErrorMessage(
  cause: unknown,
  operation: 'read' | 'save' | 'delete' = 'save',
) {
  const code =
    cause && typeof cause === 'object' && 'code' in cause
      ? String(cause.code).replace(/^firestore\//, '')
      : ''
  const messages: Record<string, string> = {
    'permission-denied': "You don't have permission to access this activity.",
    unauthenticated: 'Please sign in again to access your activities.',
    unavailable: 'Service is temporarily unavailable. Please try again.',
    'failed-precondition': 'Firestore requires an index or configuration update.',
    'app/offline': 'Check your internet connection and try again.',
    'network-request-failed': 'Check your internet connection and try again.',
    'not-found': 'This activity no longer exists. Refresh and try again.',
  }
  return (
    messages[code] ??
    (operation === 'delete'
      ? 'Unable to delete activity. Please try again.'
      : operation === 'read'
        ? 'Unable to load your activities. Please try again.'
        : 'Something went wrong while saving your activity.')
  )
}
