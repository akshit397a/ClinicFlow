import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[#111111] text-white hover:bg-[#242424] active:bg-[#000000] shadow-sm border border-transparent disabled:bg-[#e5e7eb] disabled:text-[#9ca3af] disabled:shadow-none',
  secondary:
    'bg-white text-[#111111] border border-[#e5e7eb] hover:bg-[#f8f9fa] hover:border-[#d1d5db] active:bg-[#f3f4f6] shadow-xs disabled:text-[#9ca3af] disabled:border-[#f3f4f6]',
  danger:
    'bg-[#ef4444] text-white hover:bg-[#dc2626] active:bg-[#b91c1c] shadow-sm border border-transparent disabled:bg-[#fca5a5]',
  ghost:
    'bg-transparent text-[#374151] hover:bg-[#f3f4f6] hover:text-[#111111] active:bg-[#e5e7eb] disabled:text-[#9ca3af]',
  outline:
    'bg-transparent text-[#111111] border border-[#e5e7eb] hover:bg-[#f8f9fa] disabled:text-[#9ca3af]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-xs rounded-md',
  md: 'px-3.5 py-2 text-sm rounded-lg',
  lg: 'px-4 py-2.5 text-base rounded-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 cursor-pointer disabled:cursor-not-allowed select-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent shrink-0" />
      )}
      {children}
    </button>
  );
}