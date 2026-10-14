export function ShortcutHint({ children }: { children: string }) {
  return (
    <kbd className="shortcut-hint" aria-hidden="true">
      {children}
    </kbd>
  )
}
