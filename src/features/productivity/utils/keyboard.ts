// Structural typing keeps the guard testable without a browser/DOM dependency.
export function isEditableElement(target: EventTarget | null): boolean {
  const element = target as
    | (EventTarget & {
        tagName?: string
        isContentEditable?: boolean
        closest?: (selector: string) => unknown
      })
    | null
  return Boolean(
    element &&
    (/^(INPUT|TEXTAREA|SELECT)$/i.test(element.tagName ?? '') ||
      element.isContentEditable ||
      element.closest?.(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"]',
      )),
  )
}

export type ActivityShortcut = 'new' | 'today' | 'previous' | 'next' | 'help'
export function getActivityShortcut(
  event: {
    key: string
    target: EventTarget | null
    ctrlKey: boolean
    metaKey: boolean
    altKey: boolean
    shiftKey: boolean
    repeat: boolean
    isComposing: boolean
    defaultPrevented: boolean
  },
  overlayOpen: boolean,
): ActivityShortcut | null {
  if (
    overlayOpen ||
    event.defaultPrevented ||
    event.repeat ||
    event.isComposing ||
    isEditableElement(event.target) ||
    event.ctrlKey ||
    event.metaKey
  )
    return null
  if (event.altKey) {
    if (event.shiftKey) return null
    if (event.key === 'ArrowLeft') return 'previous'
    if (event.key === 'ArrowRight') return 'next'
    return null
  }
  if (event.key === '?') return 'help'
  if (event.shiftKey) return null
  if (event.key.toLowerCase() === 'n') return 'new'
  if (event.key.toLowerCase() === 't') return 'today'
  return null
}

export function isSaveShortcut(event: {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
  repeat: boolean
  isComposing: boolean
}): boolean {
  return (
    event.key === 'Enter' &&
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    !event.repeat &&
    !event.isComposing
  )
}
