import { useId, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }
export function Input({ label, error, id, className = '', ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div className={`field ${className}`}>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <span id={`${inputId}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  )
}
type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string }
export function Select({ label, id, className = '', ...props }: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  return (
    <div className={`field ${className}`}>
      <label htmlFor={selectId}>{label}</label>
      <select id={selectId} {...props} />
    </div>
  )
}
