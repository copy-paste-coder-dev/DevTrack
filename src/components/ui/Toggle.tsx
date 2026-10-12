interface ToggleProps {
  label: string
  checked: boolean
  onChange: () => void
  disabled?: boolean
}
export function Toggle({ label, checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="toggle-switch"
      onClick={onChange}
      disabled={disabled}
    >
      <span />
    </button>
  )
}
