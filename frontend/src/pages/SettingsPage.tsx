import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import UserMenu from '../components/UserMenu'

interface Account {
  id: number
  username: string
  email: string
  admin: boolean
}

interface Settings {
  // Item practice
  default_question_count: number
  default_level_min: number
  default_level_max: number
  default_item_type: string
  default_practice_mode: string
  review_order: string
  // Sentence practice
  sentence_default_scope: 'current_level' | 'all_eligible' | 'custom'
  sentence_default_stage_filter: 'all' | 'apprentice_only' | 'guru_plus'
  sentence_default_mix: 'new_only' | 'review_only' | 'mix'
  breakdown_panel_mode: 'always' | 'never' | 'on_incorrect'
  furigana_default_visible: boolean
  // Preferences
  show_furigana: boolean
  autoplay_audio: boolean
  keyboard_shortcuts: boolean
  theme: string
  daily_practice_goal: number
}

interface WkProfile {
  connected: boolean
  masked_token?: string
  username?: string
  level?: number
  sync_status?: string
  last_synced_at?: string
  last_sync_error?: string | null
}

type TabId = 'account' | 'wanikani' | 'item' | 'sentence' | 'preferences'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { fetchUser } = useAuth()

  const [tab, setTab] = useState<TabId>('account')
  const [account, setAccount] = useState<Account | null>(null)
  const [accountDraft, setAccountDraft] = useState<Partial<Account>>({})
  const [settings, setSettings] = useState<Settings | null>(null)
  const [settingsDraft, setSettingsDraft] = useState<Settings | null>(null)
  const [wk, setWk] = useState<WkProfile | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  // Password change
  const [passwordCurrent, setPasswordCurrent] = useState('')
  const [passwordNew, setPasswordNew] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // WK token replacement
  const [showReplaceForm, setShowReplaceForm] = useState(false)
  const [newToken, setNewToken] = useState('')
  const [replacingToken, setReplacingToken] = useState(false)
  const [accountSwitchWarning, setAccountSwitchWarning] = useState<{ current: string; next: string } | null>(null)

  // Account delete
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')

  // Disconnect WK confirm
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false)

  // Track unsaved changes
  const dirty = useMemo(() => {
    if (!settings || !settingsDraft) return false
    return JSON.stringify(settings) !== JSON.stringify(settingsDraft) ||
           !!accountDraft.username && accountDraft.username !== account?.username ||
           !!accountDraft.email && accountDraft.email !== account?.email
  }, [settings, settingsDraft, accountDraft, account])

  // Initial load
  useEffect(() => {
    fetchUser()
    Promise.all([
      api.get('/account').then((r) => r.data.account),
      api.get('/practice_setting').then((r) => r.data),
      api.get('/wanikani_profile').then((r) => r.data).catch(() => ({ connected: false })),
    ])
      .then(([acct, sett, profile]) => {
        setAccount(acct)
        setAccountDraft({ username: acct.username, email: acct.email })
        setSettings(sett)
        setSettingsDraft(sett)
        setWk(profile)
      })
      .catch(() => showToast('error', 'Could not load settings'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function showToast(kind: 'success' | 'error', text: string) {
    setToast({ kind, text })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSaveAll() {
    if (!settingsDraft) return
    setSaving(true)
    try {
      // Save account if username/email changed
      if ((accountDraft.username && accountDraft.username !== account?.username) ||
          (accountDraft.email && accountDraft.email !== account?.email)) {
        const { data } = await api.patch('/account', accountDraft)
        setAccount(data.account)
        await fetchUser() // refresh nav-bar username
      }

      // Save settings
      const { data: newSettings } = await api.patch('/practice_setting', settingsDraft)
      setSettings(newSettings)
      setSettingsDraft(newSettings)

      showToast('success', 'Settings saved')
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { errors?: string[] } } }).response?.data?.errors?.join(', ')
          : null
      showToast('error', message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetDefaults() {
    if (!confirm('Reset all settings to defaults? Your account info won\'t be touched.')) return
    setResetting(true)
    try {
      const { data } = await api.post('/practice_setting/reset')
      setSettings(data)
      setSettingsDraft(data)
      showToast('success', 'Settings reset to defaults')
    } catch {
      showToast('error', 'Could not reset')
    } finally {
      setResetting(false)
    }
  }

  async function handleChangePassword() {
    setChangingPassword(true)
    try {
      await api.patch('/account/password', {
        current_password: passwordCurrent,
        new_password: passwordNew,
        new_password_confirmation: passwordConfirm,
      })
      setPasswordCurrent('')
      setPasswordNew('')
      setPasswordConfirm('')
      showToast('success', 'Password updated')
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { errors?: string[] } } }).response?.data?.errors?.join(', ')
          : null
      showToast('error', message || 'Could not change password')
    } finally {
      setChangingPassword(false)
    }
  }

  async function handleDisconnectWk(purge: boolean) {
    setDisconnectConfirmOpen(false)
    try {
      await api.delete('/wanikani_profile', { params: { purge: purge ? 'true' : 'false' } })
      setWk({ connected: false })
      showToast('success', purge ? 'WaniKani disconnected and progress wiped' : 'WaniKani disconnected')
    } catch {
      showToast('error', 'Could not disconnect')
    }
  }

  async function handleReplaceToken(confirmSwitch = false) {
    if (!newToken.trim()) return
    setReplacingToken(true)
    try {
      const { data } = await api.patch('/wanikani_profile/replace_token', {
        api_token: newToken.trim(),
        confirm_account_switch: confirmSwitch ? 'true' : 'false',
      })
      setNewToken('')
      setShowReplaceForm(false)
      setAccountSwitchWarning(null)
      // Refresh WK profile
      const { data: prof } = await api.get('/wanikani_profile')
      setWk(prof)
      showToast('success', data.switched_accounts ? 'Token replaced (different account — progress wiped)' : 'Token replaced')
    } catch (err: unknown) {
      const response = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { kind?: string; current_username?: string; new_username?: string; error?: string } } }).response
        : null

      if (response?.data?.kind === 'account_mismatch') {
        setAccountSwitchWarning({
          current: response.data.current_username || '',
          next: response.data.new_username || '',
        })
      } else {
        showToast('error', response?.data?.error || 'Could not replace token')
      }
    } finally {
      setReplacingToken(false)
    }
  }

  async function handleDeleteAccount() {
    if (!deletePassword) return
    try {
      await api.delete('/account', { data: { password: deletePassword } })
      localStorage.removeItem('auth_token')
      navigate('/', { replace: true })
    } catch {
      showToast('error', 'Could not delete account (wrong password?)')
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-cream flex items-center justify-center font-mono text-sm opacity-60">Loading…</div>
  }

  if (!settings || !settingsDraft || !account) {
    return <div className="min-h-screen bg-cream flex items-center justify-center font-mono text-sm">Could not load settings.</div>
  }

  const tabs: Array<{ id: TabId; label: string; emoji: string }> = [
    { id: 'account',     label: 'Account',          emoji: '👤' },
    { id: 'wanikani',    label: 'WaniKani',         emoji: '蟹' },
    { id: 'item',        label: 'Item Practice',    emoji: '⌐' },
    { id: 'sentence',    label: 'Sentence Practice', emoji: '文' },
    { id: 'preferences', label: 'Preferences',      emoji: '⚙' },
  ]

  return (
    <div className="min-h-screen bg-cream relative pb-32">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#1a0b2e 1px, transparent 1px), linear-gradient(90deg, #1a0b2e 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <header className="relative z-10 px-5 sm:px-8 py-4 flex justify-between items-center border-b-[3px] border-ink bg-cream">
        <Link to="/dashboard" className="flex items-center gap-2.5 no-underline text-ink">
          <div className="grid place-items-center w-9 h-9 bg-pink-hot border-[2.5px] border-ink rounded-lg font-body font-black text-cream text-xl shadow-hard-sm -rotate-[4deg]">
            蟹
          </div>
          <span className="font-display text-base">KaniCompanion</span>
        </Link>
        <UserMenu />
      </header>

      <main className="relative z-10 max-w-[1100px] mx-auto px-5 sm:px-8 py-8">
        <div className="mb-6">
          <span className="inline-block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-pink-hot font-bold mb-3 px-2.5 py-1 bg-cream border-2 border-pink-hot rounded-md">
            // settings
          </span>
          <h1 className="font-display text-[clamp(1.8rem,3.5vw,2.4rem)] leading-[0.95] tracking-[-0.02em]">
            Tweak your setup
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-5">
          {/* Tab nav */}
          <nav className="bg-white border-[3px] border-ink rounded-2xl p-2 shadow-hard-md self-start sticky top-4">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg font-mono text-[0.8rem] font-bold uppercase tracking-wider mb-1 last:mb-0 transition-colors flex items-center gap-2 ${
                  tab === t.id ? 'bg-pink-hot text-cream' : 'hover:bg-pink-soft'
                }`}
              >
                <span className="opacity-70">{t.emoji}</span>
                <span className="text-[0.72rem]">{t.label}</span>
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <div className="bg-white border-[3px] border-ink rounded-2xl p-6 sm:p-8 shadow-hard-md">
            {tab === 'account' && (
              <AccountTab
                account={account}
                draft={accountDraft}
                onChange={setAccountDraft}
                pwCurrent={passwordCurrent}
                pwNew={passwordNew}
                pwConfirm={passwordConfirm}
                setPwCurrent={setPasswordCurrent}
                setPwNew={setPasswordNew}
                setPwConfirm={setPasswordConfirm}
                onChangePassword={handleChangePassword}
                changingPassword={changingPassword}
                onOpenDelete={() => setDeleteConfirmOpen(true)}
              />
            )}

            {tab === 'wanikani' && (
              <WaniKaniTab
                wk={wk}
                onOpenDisconnect={() => setDisconnectConfirmOpen(true)}
                showReplaceForm={showReplaceForm}
                setShowReplaceForm={setShowReplaceForm}
                newToken={newToken}
                setNewToken={setNewToken}
                onReplace={() => handleReplaceToken(false)}
                replacingToken={replacingToken}
                accountSwitchWarning={accountSwitchWarning}
                onConfirmSwitch={() => handleReplaceToken(true)}
                onCancelSwitch={() => setAccountSwitchWarning(null)}
              />
            )}

            {tab === 'item' && (
              <ItemPracticeTab settings={settingsDraft} onChange={setSettingsDraft} />
            )}

            {tab === 'sentence' && (
              <SentencePracticeTab settings={settingsDraft} onChange={setSettingsDraft} />
            )}

            {tab === 'preferences' && (
              <PreferencesTab settings={settingsDraft} onChange={setSettingsDraft} />
            )}
          </div>
        </div>
      </main>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-ink text-cream border-t-[3px] border-pink-hot">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="font-mono text-[0.78rem]">
            {dirty ? (
              <span className="text-yellow-pop">⚠ unsaved changes</span>
            ) : (
              <span className="opacity-70">all settings saved</span>
            )}
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={handleResetDefaults}
              disabled={resetting || saving}
              className="px-4 py-2 bg-cream/10 text-cream border-2 border-cream/30 rounded-lg font-mono text-[0.72rem] font-bold uppercase tracking-wider hover:bg-cream/20 disabled:opacity-50"
            >
              {resetting ? 'Resetting…' : '↺ Reset to defaults'}
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving || !dirty}
              className="px-5 py-2 bg-mint text-ink border-2 border-ink rounded-lg font-display text-sm disabled:opacity-50 enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 transition-transform"
              style={{ boxShadow: '3px 3px 0 #ff3d8a' }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-30 px-4 py-3 border-[2.5px] border-ink rounded-xl font-mono text-sm font-bold shadow-hard-md ${
              toast.kind === 'success' ? 'bg-mint text-ink' : 'bg-pink-hot text-cream'
            }`}
          >
            {toast.kind === 'success' ? '✓' : '⚠'} {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disconnect WK confirm */}
      <AnimatePresence>
        {disconnectConfirmOpen && (
          <Modal onClose={() => setDisconnectConfirmOpen(false)}>
            <h3 className="font-display text-xl mb-2">Disconnect WaniKani?</h3>
            <p className="text-sm opacity-75 mb-5">
              You can keep your local practice progress (recommended) or wipe it for a clean slate.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => handleDisconnectWk(false)}
                className="w-full text-left px-4 py-3 bg-mint border-[2.5px] border-ink rounded-lg shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
              >
                <div className="font-display text-[0.85rem]">Keep my progress</div>
                <div className="font-mono text-[0.7rem] opacity-65 mt-0.5">
                  Disconnect WK · keep practice answers, SRS, and stats
                </div>
              </button>
              <button
                onClick={() => handleDisconnectWk(true)}
                className="w-full text-left px-4 py-3 bg-pink-hot text-cream border-[2.5px] border-ink rounded-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
              >
                <div className="font-display text-[0.85rem]">Wipe everything</div>
                <div className="font-mono text-[0.7rem] opacity-75 mt-0.5">
                  Disconnect AND delete assignments, SRS, study materials
                </div>
              </button>
              <button
                onClick={() => setDisconnectConfirmOpen(false)}
                className="px-4 py-2 bg-white border-2 border-ink rounded-lg font-mono text-[0.72rem] font-bold uppercase"
              >
                Cancel
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Account-switch confirm modal */}
      <AnimatePresence>
        {accountSwitchWarning && (
          <Modal onClose={() => setAccountSwitchWarning(null)}>
            <h3 className="font-display text-xl mb-2">Different WaniKani account</h3>
            <p className="text-sm opacity-75 mb-3 leading-relaxed">
              The token you entered is for <strong>{accountSwitchWarning.next}</strong>, not <strong>{accountSwitchWarning.current}</strong>.
            </p>
            <p className="text-sm opacity-75 mb-5 leading-relaxed">
              Switching accounts will <strong>wipe your local practice progress</strong> (assignments, SRS state, study materials) since they belong to the other account. Continue?
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setAccountSwitchWarning(null)}
                className="px-4 py-2 bg-white border-2 border-ink rounded-lg font-mono text-[0.72rem] font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReplaceToken(true)}
                disabled={replacingToken}
                className="px-4 py-2 bg-pink-hot text-cream border-2 border-ink rounded-lg font-mono text-[0.72rem] font-bold uppercase disabled:opacity-50"
                style={{ boxShadow: '3px 3px 0 #1a0b2e' }}
              >
                {replacingToken ? 'Replacing…' : 'Yes, switch & wipe'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete account confirm */}
      <AnimatePresence>
        {deleteConfirmOpen && (
          <Modal onClose={() => setDeleteConfirmOpen(false)}>
            <h3 className="font-display text-xl mb-2 text-pink-hot">Delete account permanently?</h3>
            <p className="text-sm opacity-75 mb-3 leading-relaxed">
              This deletes your account, all practice data, SRS state, and disconnects WaniKani.
              <strong> This cannot be undone.</strong>
            </p>
            <p className="text-sm opacity-75 mb-3 leading-relaxed">
              Type your password to confirm:
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Password"
              className="w-full px-3 py-2 border-2 border-ink rounded-lg font-mono text-sm bg-cream/60"
              autoFocus
            />
            <div className="mt-4 flex gap-2.5 justify-end">
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false)
                  setDeletePassword('')
                }}
                className="px-4 py-2 bg-white border-2 border-ink rounded-lg font-mono text-[0.72rem] font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={!deletePassword}
                className="px-4 py-2 bg-pink-hot text-cream border-2 border-ink rounded-lg font-mono text-[0.72rem] font-bold uppercase disabled:opacity-50"
                style={{ boxShadow: '3px 3px 0 #1a0b2e' }}
              >
                Delete forever
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-ink/70 z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-cream border-[3px] border-ink rounded-2xl p-6 max-w-[460px] w-full shadow-hard-lg"
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

// =====================
// TABS
// =====================

function AccountTab({
  account, draft, onChange,
  pwCurrent, pwNew, pwConfirm, setPwCurrent, setPwNew, setPwConfirm,
  onChangePassword, changingPassword, onOpenDelete,
}: {
  account: Account
  draft: Partial<Account>
  onChange: (d: Partial<Account>) => void
  pwCurrent: string
  pwNew: string
  pwConfirm: string
  setPwCurrent: (v: string) => void
  setPwNew: (v: string) => void
  setPwConfirm: (v: string) => void
  onChangePassword: () => void
  changingPassword: boolean
  onOpenDelete: () => void
}) {
  return (
    <div className="flex flex-col gap-7">
      <Section title="// PROFILE" desc="Username and email — saved with the main Save button">
        <Field label="Username">
          <input
            type="text"
            value={draft.username || ''}
            onChange={(e) => onChange({ ...draft, username: e.target.value })}
            className="w-full px-3 py-2 border-2 border-ink rounded-lg font-body bg-cream/60 outline-none focus:border-pink-hot"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={draft.email || ''}
            onChange={(e) => onChange({ ...draft, email: e.target.value })}
            className="w-full px-3 py-2 border-2 border-ink rounded-lg font-body bg-cream/60 outline-none focus:border-pink-hot"
          />
        </Field>
        <div className="font-mono text-[0.65rem] opacity-50 uppercase">Member since: {new Date(account.id ? Date.now() : Date.now()).toLocaleDateString()}</div>
      </Section>

      <Divider />

      <Section title="// PASSWORD" desc="Updates immediately when you click 'Update password'">
        <Field label="Current password">
          <input
            type="password"
            value={pwCurrent}
            onChange={(e) => setPwCurrent(e.target.value)}
            className="w-full px-3 py-2 border-2 border-ink rounded-lg font-mono text-sm bg-cream/60"
            autoComplete="current-password"
          />
        </Field>
        <Field label="New password (8+ chars)">
          <input
            type="password"
            value={pwNew}
            onChange={(e) => setPwNew(e.target.value)}
            className="w-full px-3 py-2 border-2 border-ink rounded-lg font-mono text-sm bg-cream/60"
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm new password">
          <input
            type="password"
            value={pwConfirm}
            onChange={(e) => setPwConfirm(e.target.value)}
            className="w-full px-3 py-2 border-2 border-ink rounded-lg font-mono text-sm bg-cream/60"
            autoComplete="new-password"
          />
        </Field>
        <button
          onClick={onChangePassword}
          disabled={changingPassword || !pwCurrent || !pwNew || pwNew !== pwConfirm}
          className="self-start px-4 py-2 bg-ink text-cream border-2 border-ink rounded-lg font-mono text-[0.72rem] font-bold uppercase shadow-hard-sm disabled:opacity-50"
          style={{ boxShadow: '3px 3px 0 #ff3d8a' }}
        >
          {changingPassword ? 'Updating…' : 'Update password'}
        </button>
      </Section>

      <Divider />

      <Section title="// DANGER ZONE" desc="Permanent and irreversible">
        <button
          onClick={onOpenDelete}
          className="self-start px-4 py-2 bg-pink-soft border-2 border-pink-hot text-pink-hot rounded-lg font-mono text-[0.72rem] font-bold uppercase hover:bg-pink-hot hover:text-cream transition-colors"
        >
          ✕ Delete account
        </button>
      </Section>
    </div>
  )
}

function WaniKaniTab({
  wk,
  onOpenDisconnect,
  showReplaceForm, setShowReplaceForm,
  newToken, setNewToken,
  onReplace, replacingToken,
  accountSwitchWarning,
}: {
  wk: WkProfile | null
  onOpenDisconnect: () => void
  showReplaceForm: boolean
  setShowReplaceForm: (v: boolean) => void
  newToken: string
  setNewToken: (v: string) => void
  onReplace: () => void
  replacingToken: boolean
  accountSwitchWarning: { current: string; next: string } | null
  onConfirmSwitch: () => void
  onCancelSwitch: () => void
}) {
  if (!wk?.connected) {
    return (
      <div className="text-center py-12">
        <div className="font-display text-xl mb-2">Not connected</div>
        <p className="text-sm opacity-65 mb-4">Connect WaniKani to sync your level, vocabulary, and start practicing.</p>
        <Link
          to="/connect-wanikani"
          className="inline-block px-4 py-2 bg-ink text-cream border-2 border-ink rounded-lg font-display text-sm no-underline"
          style={{ boxShadow: '3px 3px 0 #ff3d8a' }}
        >
          Connect WaniKani →
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <Section title="// CONNECTION" desc="Your WaniKani API connection">
        <div className="bg-cream/40 border-2 border-ink rounded-lg p-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Stat label="Username" value={wk.username || '—'} />
            <Stat label="Level" value={wk.level?.toString() || '—'} />
          </div>
          <div className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-wider mb-1">
            <span className="opacity-55">Token:</span>
            <code className="bg-ink text-cream px-2 py-0.5 rounded">{wk.masked_token}</code>
          </div>
          <div className="font-mono text-[0.7rem] opacity-55 uppercase">
            Status: <span className="text-ink/80">{wk.sync_status}</span>
            {wk.last_synced_at && <> · Last synced: {new Date(wk.last_synced_at).toLocaleString()}</>}
          </div>
          {wk.last_sync_error && (
            <div className="mt-2 bg-pink-soft border-2 border-pink-hot rounded-md px-2 py-1 font-mono text-[0.7rem] text-pink-hot">
              ⚠ {wk.last_sync_error}
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="// REPLACE TOKEN" desc="Paste a new API token (e.g. if you regenerated yours on WK)">
        {showReplaceForm ? (
          <div className="flex flex-col gap-2">
            <input
              type="password"
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
              placeholder="Paste new WaniKani API token…"
              className="w-full px-3 py-2 border-2 border-ink rounded-lg font-mono text-sm bg-cream/60 outline-none focus:border-pink-hot"
              autoComplete="off"
            />
            {accountSwitchWarning && (
              <div className="bg-yellow-pop/40 border-2 border-yellow-pop rounded-md p-2.5 font-mono text-[0.7rem]">
                ⚠ Different WK account detected — see modal
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={onReplace}
                disabled={replacingToken || !newToken.trim()}
                className="px-4 py-2 bg-ink text-cream border-2 border-ink rounded-lg font-mono text-[0.72rem] font-bold uppercase disabled:opacity-50"
                style={{ boxShadow: '3px 3px 0 #ff3d8a' }}
              >
                {replacingToken ? 'Validating…' : 'Replace'}
              </button>
              <button
                onClick={() => {
                  setShowReplaceForm(false)
                  setNewToken('')
                }}
                className="px-4 py-2 bg-white border-2 border-ink rounded-lg font-mono text-[0.72rem] font-bold uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowReplaceForm(true)}
            className="self-start px-4 py-2 bg-yellow-pop border-2 border-ink rounded-lg font-mono text-[0.72rem] font-bold uppercase shadow-hard-sm"
          >
            ↻ Replace token
          </button>
        )}
      </Section>

      <Divider />

      <Section title="// DISCONNECT" desc="Unlink WaniKani — you can reconnect later">
        <button
          onClick={onOpenDisconnect}
          className="self-start px-4 py-2 bg-pink-soft border-2 border-pink-hot text-pink-hot rounded-lg font-mono text-[0.72rem] font-bold uppercase hover:bg-pink-hot hover:text-cream transition-colors"
        >
          Disconnect WaniKani
        </button>
      </Section>
    </div>
  )
}

function ItemPracticeTab({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  return (
    <div className="flex flex-col gap-7">
      <Section title="// DEFAULT QUESTION COUNT" desc="Pre-selected on the practice setup page">
        <NumberInput
          value={settings.default_question_count}
          min={1} max={500}
          onChange={(v) => onChange({ ...settings, default_question_count: v })}
        />
      </Section>

      <Divider />

      <Section title="// DEFAULT ITEM TYPE">
        <PillRow
          options={[
            { value: 'kanji',      label: 'Kanji' },
            { value: 'vocabulary', label: 'Vocabulary' },
            { value: 'radical',    label: 'Radicals' },
          ]}
          selected={settings.default_item_type}
          onChange={(v) => onChange({ ...settings, default_item_type: v })}
        />
      </Section>

      <Divider />

      <Section title="// DEFAULT PRACTICE MODE">
        <PillRow
          options={[
            { value: 'kanji_to_meaning', label: 'JP → Meaning' },
            { value: 'kanji_to_reading', label: 'JP → Reading' },
            { value: 'mixed',            label: 'Mixed' },
          ]}
          selected={settings.default_practice_mode}
          onChange={(v) => onChange({ ...settings, default_practice_mode: v })}
        />
      </Section>

      <Divider />

      <Section title="// DEFAULT REVIEW ORDER">
        <PillRow
          options={[
            { value: 'random',          label: 'Random' },
            { value: 'weakest_first',   label: 'Weakest first' },
            { value: 'newest_first',    label: 'Newest first' },
            { value: 'oldest_first',    label: 'Oldest first' },
          ]}
          selected={settings.review_order}
          onChange={(v) => onChange({ ...settings, review_order: v })}
        />
      </Section>

      <Divider />

      <Section title="// DEFAULT LEVEL RANGE" desc="Items in these levels appear by default">
        <div className="grid grid-cols-2 gap-3 max-w-[300px]">
          <Field label="Min level">
            <NumberInput
              value={settings.default_level_min}
              min={1} max={60}
              onChange={(v) => onChange({ ...settings, default_level_min: Math.min(v, settings.default_level_max) })}
            />
          </Field>
          <Field label="Max level">
            <NumberInput
              value={settings.default_level_max}
              min={1} max={60}
              onChange={(v) => onChange({ ...settings, default_level_max: Math.max(v, settings.default_level_min) })}
            />
          </Field>
        </div>
      </Section>
    </div>
  )
}

function SentencePracticeTab({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  return (
    <div className="flex flex-col gap-7">
      <Section title="// DEFAULT SCOPE">
        <PillRow
          options={[
            { value: 'current_level', label: 'Current level' },
            { value: 'all_eligible',  label: 'All eligible' },
            { value: 'custom',        label: 'Custom (no default)' },
          ]}
          selected={settings.sentence_default_scope}
          onChange={(v) => onChange({ ...settings, sentence_default_scope: v as Settings['sentence_default_scope'] })}
        />
      </Section>

      <Divider />

      <Section title="// DEFAULT STAGE FILTER">
        <PillRow
          options={[
            { value: 'all',             label: 'All stages' },
            { value: 'apprentice_only', label: 'Apprentice only' },
            { value: 'guru_plus',       label: 'Guru+' },
          ]}
          selected={settings.sentence_default_stage_filter}
          onChange={(v) => onChange({ ...settings, sentence_default_stage_filter: v as Settings['sentence_default_stage_filter'] })}
        />
      </Section>

      <Divider />

      <Section title="// DEFAULT NEW vs REVIEWS MIX">
        <PillRow
          options={[
            { value: 'new_only',    label: 'New only' },
            { value: 'review_only', label: 'Review only' },
            { value: 'mix',         label: 'Mix' },
          ]}
          selected={settings.sentence_default_mix}
          onChange={(v) => onChange({ ...settings, sentence_default_mix: v as Settings['sentence_default_mix'] })}
        />
      </Section>

      <Divider />

      <Section title="// FURIGANA" desc="Show kana above kanji during sentence practice">
        <ToggleRow
          value={settings.furigana_default_visible}
          onChange={(v) => onChange({ ...settings, furigana_default_visible: v })}
          labels={['Visible', 'Hidden']}
        />
      </Section>

      <Divider />

      <Section title="// VOCAB BREAKDOWN PANEL" desc="When to show the post-answer vocab list">
        <PillRow
          options={[
            { value: 'always',      label: 'Always' },
            { value: 'on_incorrect', label: 'On wrong only' },
            { value: 'never',        label: 'Never' },
          ]}
          selected={settings.breakdown_panel_mode}
          onChange={(v) => onChange({ ...settings, breakdown_panel_mode: v as Settings['breakdown_panel_mode'] })}
        />
      </Section>
    </div>
  )
}

function PreferencesTab({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  return (
    <div className="flex flex-col gap-7">
      <Section title="// THEME" desc="Light / dark mode (dark mode coming soon)">
        <PillRow
          options={[
            { value: 'light',  label: 'Light' },
            { value: 'dark',   label: 'Dark (soon)', disabled: true },
            { value: 'system', label: 'System' },
          ]}
          selected={settings.theme}
          onChange={(v) => onChange({ ...settings, theme: v })}
        />
      </Section>

      <Divider />

      <Section title="// DAILY GOAL" desc="Number of items to practice each day">
        <NumberInput
          value={settings.daily_practice_goal}
          min={1} max={500}
          onChange={(v) => onChange({ ...settings, daily_practice_goal: v })}
        />
      </Section>

      <Divider />

      <Section title="// KEYBOARD SHORTCUTS" desc="Use Enter, Esc, F, etc. during practice">
        <ToggleRow
          value={settings.keyboard_shortcuts}
          onChange={(v) => onChange({ ...settings, keyboard_shortcuts: v })}
        />
      </Section>

      <Divider />

      <Section title="// AUDIO AUTOPLAY" desc="Auto-play vocab pronunciation (when available)">
        <ToggleRow
          value={settings.autoplay_audio}
          onChange={(v) => onChange({ ...settings, autoplay_audio: v })}
        />
      </Section>
    </div>
  )
}

// =====================
// Reusable bits
// =====================

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <div className="font-display text-[0.95rem] tracking-[0.02em]">{title}</div>
        {desc && <div className="font-mono text-[0.7rem] opacity-55 mt-0.5">{desc}</div>}
      </div>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="border-t-2 border-dashed border-ink/15" />
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-[0.65rem] uppercase tracking-wider opacity-65">{label}</label>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[0.6rem] uppercase tracking-wider opacity-55 mb-0.5">{label}</div>
      <div className="font-display text-base">{value}</div>
    </div>
  )
}

function PillRow({
  options,
  selected,
  onChange,
}: {
  options: Array<{ value: string; label: string; disabled?: boolean }>
  selected: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={o.disabled}
          onClick={() => !o.disabled && onChange(o.value)}
          className={`px-3.5 py-2 border-2 border-ink rounded-lg font-mono text-[0.7rem] font-bold uppercase shadow-hard-sm transition-transform enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed ${
            selected === o.value ? 'bg-pink-hot text-cream' : 'bg-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ToggleRow({
  value,
  onChange,
  labels = ['On', 'Off'],
}: {
  value: boolean
  onChange: (v: boolean) => void
  labels?: [string, string]
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-4 py-2 border-2 border-ink rounded-lg font-mono text-[0.7rem] font-bold uppercase shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform ${
          value ? 'bg-mint' : 'bg-white'
        }`}
      >
        {labels[0]}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-4 py-2 border-2 border-ink rounded-lg font-mono text-[0.7rem] font-bold uppercase shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform ${
          !value ? 'bg-pink-hot text-cream' : 'bg-white'
        }`}
      >
        {labels[1]}
      </button>
    </div>
  )
}

function NumberInput({
  value,
  min, max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10)
        if (!isNaN(n)) onChange(n)
      }}
      className="w-32 px-3 py-2 border-2 border-ink rounded-lg font-display text-base bg-cream/60 outline-none focus:border-pink-hot"
    />
  )
}
