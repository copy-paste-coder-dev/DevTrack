import { useId, type TextareaHTMLAttributes } from 'react'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }
export function Textarea({ label, error, id, className = '', ...props }: TextareaProps) {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  return (
    <div className={`field ${className}`}>
      <label htmlFor={textareaId}>{label}</label>
      <textarea
        id={textareaId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...props}
      />
      {error && (
        <span id={`${textareaId}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  )
}
