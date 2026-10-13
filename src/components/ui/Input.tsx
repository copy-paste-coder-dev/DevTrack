import { useId, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}
export function Input({
  label,
  error,
  hint,
  id,
  className = '',
  required,
  'aria-describedby': descriptionId,
  ...props
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div className={`field ${className}`}>
      <label htmlFor={inputId}>
        {label}
        {required && (
          <span className="required-mark" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [hint ? `${inputId}-hint` : '', error ? `${inputId}-error` : '', descriptionId]
            .filter(Boolean)
            .join(' ') || undefined
        }
        required={required}
        {...props}
      />
      {hint && (
        <span id={`${inputId}-hint`} className="field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${inputId}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  )
}
type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }
export function Select({ label, id, className = '', required, error, ...props }: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  return (
    <div className={`field ${className}`}>
      <label htmlFor={selectId}>
        {label}
        {required && (
          <span className="required-mark" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <select
        id={selectId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      />
      {error && (
        <span id={`${selectId}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  )
}
