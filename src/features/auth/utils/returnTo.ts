const allowedPaths = new Set(['/app', '/app/calendar', '/app/eod', '/app/settings'])

export function validateReturnTo(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    Array.from(value).some(
      (character) =>
        character === '\\' || character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
    )
  )
    return '/app'
  try {
    const url = new URL(value, 'https://devtrack.invalid')
    if (url.origin !== 'https://devtrack.invalid' || !allowedPaths.has(url.pathname)) return '/app'
    return url.pathname + url.search + url.hash
  } catch {
    return '/app'
  }
}
