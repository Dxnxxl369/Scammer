import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Label } from './Label'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = '', ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`

    return (
      <div className="space-y-1.5">
        {label && <Label htmlFor={inputId} className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] ml-1">{label}</Label>}
        <div className="relative group">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={[
              'w-full rounded-xl border px-4 py-3 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]/30',
              'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] focus:bg-[var(--card-bg)]',
              'transition-all duration-200',
              'bg-[var(--input-bg)]',
              error ? 'border-red-500/50 bg-red-500/10' : 'border-[var(--border-color)] hover:border-[var(--text-muted)]/30',
              className,
            ].join(' ')}
            {...props}
          />
        </div>
        {error ? (
          <p id={errorId} className="text-[10px] font-bold uppercase tracking-wider text-red-500 mt-1 ml-1">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-[10px] font-medium text-[var(--text-muted)] mt-1 ml-1">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'
