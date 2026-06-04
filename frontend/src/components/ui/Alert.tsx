import type { ReactNode } from 'react'

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  onClose?: () => void
  children: ReactNode
  className?: string
}

const styles = {
  info:    { wrap: 'bg-blue-50 border-blue-300 text-blue-800',    icon: 'ℹ️' },
  success: { wrap: 'bg-emerald-50 border-emerald-300 text-emerald-800', icon: '✅' },
  warning: { wrap: 'bg-amber-50 border-amber-300 text-amber-800', icon: '⚠️' },
  error:   { wrap: 'bg-red-50 border-red-300 text-red-800',       icon: '❌' },
}

export function Alert({ variant = 'info', title, onClose, children, className = '' }: AlertProps) {
  const { wrap, icon } = styles[variant]

  return (
    <div role="alert" className={`flex gap-3 rounded-lg border p-3 text-sm ${wrap} ${className}`}>
      <span className="shrink-0 text-base leading-5">{icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Cerrar alerta"
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  )
}
