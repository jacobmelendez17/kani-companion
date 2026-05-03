export interface DashboardData {
  username: string
  wanikani_level: number | null
  wanikani_username: string | null
  realm: { name: string; kanji: string } | null
  sync_status: 'pending' | 'syncing' | 'completed' | 'failed' | null
  last_synced_at: string | null
  last_sync_error: string | null

  items_unlocked: number
  level_progress_percent: number
  items_remaining_to_next: number

  learned_kanji: number
  learned_kanji_weekly: number
  learned_vocabulary: number
  learned_vocabulary_weekly: number
  sentence_eligible: number
  sentence_eligible_weekly: number

  srs_distribution: {
    apprentice: number
    guru: number
    master: number
    enlightened: number
    burned: number
  }

  daily_streak: number
  best_streak: number
  streak_calendar: Array<{
    date: string
    day_label: string
    completed: boolean
    is_today: boolean
  }>

  weak_items: Array<{
    subject_id: number
    characters: string
    meaning: string
    type: string
    stage: string
    stage_label: string
    correct: number
    total: number
    accuracy: number
  }>

  recent_mistakes: Array<{
    subject_id: number
    characters: string
    meaning: string
    type: string
    answered_at: string
    hours_ago: number
  }>

  recent_mistakes_count: number

  recommended_session: {
    mode: string
    label: string
    reason: string
    cta: string
  }
}
