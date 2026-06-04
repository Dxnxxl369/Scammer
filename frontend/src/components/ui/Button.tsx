import type { ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const variants = {
  primary: 'bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white shadow-[0_0_20px_var(--accent-glow)]',
  secondary: 'bg-[var(--text-main)] hover:bg-[var(--text-main)]/90 text-[var(--bg)] border border-[var(--border-color)]',
  ghost: 'bg-transparent hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-main)]',
  danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20',
}

const sizes = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-[0.15em] transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30',
        'disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale',
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading && <Spinner size="sm" className={variant === 'primary' ? 'text-white' : 'text-current'} />}
      {children}
    </button>
  )
}
