import type { LabelHTMLAttributes } from 'react'

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export function Label({ required, children, className = '', ...props }: LabelProps) {
  return (
    <label className={`text-sm font-medium text-slate-700 ${className}`} {...props}>
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  )
}
