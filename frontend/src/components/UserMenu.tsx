import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../lib/auth'

interface Props {
  showSyncedBadge?: boolean
  syncStatus?: 'pending' | 'syncing' | 'completed' | 'failed' | null
}

/**
 * Dropdown menu shown in the top-right corner of authenticated pages.
 * Triggered by clicking the username/avatar. Contains links to Settings, Admin
 * (if user is admin), and a Log out button.
 */
export default function UserMenu({ showSyncedBadge, syncStatus }: Props) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', onClick)
      return () => document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  // Close on escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  async function handleLogout() {
    setOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  const initial = user?.username?.[0]?.toUpperCase() || '?'

  return (
    <div className="flex items-center gap-3" ref={menuRef}>
      {showSyncedBadge && syncStatus === 'completed' && (
        <span className="hidden sm:inline-flex items-center gap-1.5 bg-mint border-2 border-ink rounded-full px-2.5 py-1 font-mono text-[0.7rem] font-bold uppercase shadow-hard-sm">
          <span className="w-1.5 h-1.5 bg-[#00b76a] rounded-full" />
          Synced
        </span>
      )}

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-2 py-1 border-2 border-ink/30 rounded-lg hover:border-ink hover:bg-pink-soft/30 transition-all"
          aria-label="User menu"
          aria-expanded={open}
        >
          <span className="grid place-items-center w-7 h-7 bg-pink-hot text-cream font-display text-sm rounded border-2 border-ink">
            {initial}
          </span>
          <span className="hidden sm:block font-mono text-[0.78rem] opacity-70 max-w-[120px] truncate">
            {user?.username}
          </span>
          <span className={`opacity-50 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-2 min-w-[200px] bg-cream border-[2.5px] border-ink rounded-xl shadow-hard-md overflow-hidden z-[1000]"
            >
              {/* User info */}
              <div className="px-4 py-3 border-b-2 border-ink/15">
                <div className="font-display text-sm leading-tight">{user?.username}</div>
                <div className="font-mono text-[0.65rem] opacity-60 truncate mt-0.5">{user?.email}</div>
                {user?.admin && (
                  <span className="inline-block mt-1 font-mono text-[0.6rem] uppercase bg-yellow-pop border border-ink rounded px-1.5 py-0.5">
                    ADMIN
                  </span>
                )}
              </div>

              {/* Menu items */}
              <div className="flex flex-col">
                <MenuItem to="/settings" onClick={() => setOpen(false)}>
                  ⚙ Settings
                </MenuItem>
                {user?.admin && (
                  <MenuItem to="/admin/phrases" onClick={() => setOpen(false)}>
                    ★ Admin · phrases
                  </MenuItem>
                )}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2.5 text-left font-mono text-[0.78rem] uppercase tracking-wider hover:bg-pink-hot hover:text-cream transition-colors border-t-2 border-ink/15"
                >
                  Log out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function MenuItem({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="px-4 py-2.5 text-left font-mono text-[0.78rem] uppercase tracking-wider no-underline text-ink hover:bg-pink-soft transition-colors"
    >
      {children}
    </Link>
  )
}
