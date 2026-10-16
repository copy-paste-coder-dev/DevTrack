export async function copySummary(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch {
    /* The selection fallback also supports browsers that deny clipboard permission. */
  }
  const previous = document.activeElement
  const field = document.createElement('textarea')
  field.value = text
  field.style.position = 'fixed'
  field.style.opacity = '0'
  field.setAttribute('aria-label', 'Summary to copy')
  document.body.append(field)
  field.select()
  try {
    if (!document.execCommand('copy')) throw new Error('Clipboard unavailable')
  } finally {
    field.remove()
    if (previous instanceof HTMLElement) previous.focus()
  }
}
