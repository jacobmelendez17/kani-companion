import { useState } from 'react'
import { DashboardData } from '../../lib/dashboardTypes'
import { timeAgo } from '../../lib/timeAgo'
import api from '../../lib/api'

interface Props {
  data: DashboardData
  onResync: () => void
}

export default function SyncCard({ data, onResync }: Props) {
  const [resyncing, setResyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleResync() {
    setError(null)
    setResyncing(true)
    try {
      await api.post('/wanikani_profile/resync')
      onResync()
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setError(message || 'Could not resync. Try again.')
    } finally {
      setResyncing(false)
    }
  }

  const status = data.sync_status

  // Map status -> dot color
  const statusColor =
    status === 'completed'
      ? 'bg-[#00b76a]'
      : status === 'syncing'
      ? 'bg-yellow-pop animate-pulse'
      : status === 'failed'
      ? 'bg-pink-hot'
      : 'bg-ink/30'

  const statusLabel =
    status === 'completed'
      ? 'Synced'
      : status === 'syncing'
      ? 'Syncing…'
      : status === 'failed'
      ? 'Failed'
      : status === 'pending'
      ? 'Pending'
      : 'Not connected'

  return (
    <div className="lg:col-span-3 bg-mint border-[3px] border-ink rounded-[18px] p-5 shadow-hard-md">
      <span className="block font-mono text-[0.65rem] uppercase tracking-[0.12em] font-bold opacity-60 mb-2">
        // LAST SYNC
      </span>

      <div className="flex items-center gap-2 mt-2">
        <span className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
        <span className="font-mono text-[0.78rem] font-bold uppercase tracking-wider">
          {statusLabel}
        </span>
      </div>

      <div className="font-body font-bold text-base mt-2">
        {data.last_synced_at ? timeAgo(data.last_synced_at) : 'Never'}
      </div>

      {data.last_sync_error && (
        <div className="mt-2 font-mono text-[0.65rem] text-pink-hot/90 bg-white/40 p-2 rounded-md">
          {data.last_sync_error}
        </div>
      )}

      {error && (
        <div className="mt-2 font-mono text-[0.65rem] text-pink-hot bg-white/40 p-2 rounded-md">
          {error}
        </div>
      )}

      {data.wanikani_level !== null && (
        <button
          onClick={handleResync}
          disabled={resyncing || status === 'syncing'}
          className="mt-3 px-3 py-2 bg-cream border-[2.5px] border-ink rounded-lg font-mono text-[0.7rem] font-bold uppercase tracking-wider shadow-hard-sm disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 transition-transform"
        >
          {resyncing ? '↻ Syncing…' : '↻ Re-sync'}
        </button>
      )}
    </div>
  )
}
