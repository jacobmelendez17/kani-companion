import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  status?: ReactNode
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, status, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col mb-4">
        <label className="font-mono text-[0.7rem] uppercase font-bold tracking-[0.08em] mb-1.5 ml-0.5">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            {...props}
            className={`w-full px-4 py-3.5 border-[2.5px] rounded-[10px] font-body text-base bg-white shadow-hard-sm transition-all duration-150 outline-none focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-hard-pink ${
              error ? 'border-pink-hot' : 'border-ink focus:border-pink-hot'
            } ${className}`}
          />
          {status && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[0.7rem] font-bold uppercase">
              {status}
            </span>
          )}
        </div>
        {error && (
          <span className="font-mono text-[0.7rem] text-pink-hot mt-1.5 ml-0.5">
            ⚠ {error}
          </span>
        )}
      </div>
    )
  }
)
FormField.displayName = 'FormField'

interface SubmitButtonProps {
  children: ReactNode
  loading?: boolean
  disabled?: boolean
  type?: 'submit' | 'button'
  onClick?: () => void
}

export function SubmitButton({
  children,
  loading,
  disabled,
  type = 'submit',
  onClick,
}: SubmitButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className="w-full py-4 mt-2 bg-ink text-cream border-[2.5px] border-ink rounded-[10px] font-display text-[0.95rem] tracking-[0.02em] cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5"
      style={{
        boxShadow: loading || disabled ? '2px 2px 0 #ff3d8a' : '4px 4px 0 #ff3d8a',
      }}
    >
      {loading ? 'Loading…' : children}
    </button>
  )
}

export function Divider({ children = 'or' }: { children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3.5 my-1 opacity-50 font-mono text-[0.7rem] uppercase tracking-[0.15em]">
      <div className="flex-1 h-0.5 bg-ink/20 rounded" />
      <span>{children}</span>
      <div className="flex-1 h-0.5 bg-ink/20 rounded" />
    </div>
  )
}

export function GoogleButton() {
  // Stubbed for now — wired up later
  const handleClick = () => {
    alert('Google sign-in coming soon!')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full py-3.5 bg-white text-ink border-[2.5px] border-ink rounded-[10px] font-body font-bold text-[0.95rem] cursor-pointer transition-all duration-150 flex items-center justify-center gap-2.5 shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a0b2e]"
    >
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path
          d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
          fill="#4285F4"
        />
        <path
          d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
          fill="#34A853"
        />
        <path
          d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
          fill="#FBBC05"
        />
        <path
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
          fill="#EA4335"
        />
      </svg>
      Continue with Google
    </button>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-pink-soft border-2 border-pink-hot rounded-[10px] px-4 py-3 mb-4 font-mono text-[0.8rem] text-ink shadow-hard-sm">
      ⚠ {message}
    </div>
  )
}
