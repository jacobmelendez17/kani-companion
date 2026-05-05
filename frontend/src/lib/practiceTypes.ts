// Existing types stay; sentence-related types updated for tokens.

export interface PracticeSettings {
  default_question_count: number
  default_level_min: number
  default_level_max: number
  default_item_type: string
  default_practice_mode: string
  show_furigana: boolean
  autoplay_audio: boolean
  keyboard_shortcuts: boolean
  theme: string
  daily_practice_goal: number
  review_order: string
  breakdown_panel_mode?: 'always' | 'never' | 'on_incorrect'
  furigana_default_visible?: boolean
  sentence_default_scope?: 'current_level' | 'all_eligible' | 'custom'
  sentence_default_stage_filter?: 'all' | 'apprentice_only' | 'guru_plus'
  sentence_default_mix?: 'new_only' | 'review_only' | 'mix'
}

export interface PracticeQuestion {
  kind?: 'item' | 'sentence'
  subject_id: number
  wanikani_id?: number
  subject_type: 'radical' | 'kanji' | 'vocabulary'
  level: number
  characters: string
  slug?: string
  question_type?: 'meaning' | 'reading'
  prompt?: string
  index: number
  total: number
}

// Each token in a sentence — produced server-side by MeCab.
// reading_hira is in hiragana (already converted from MeCab's katakana output).
// subject_info is populated when the token matches a WK kanji/vocab subject.
export interface SentenceToken {
  surface: string
  dictionary_form: string
  reading_kata: string | null
  reading_hira: string | null
  pos: string | null
  is_kanji: boolean
  subject_id: number | null
  subject_info: {
    id: number
    characters: string
    type: 'kanji' | 'vocabulary'
    level: number
    meaning: string | null
    reading: string | null
    unlocked: boolean
  } | null
}

export interface SentenceQuestion extends PracticeQuestion {
  kind: 'sentence'
  phrase_id: number
  target_meaning: string
  target_reading: string | null
  stage: number
  stage_label: string
  japanese: string
  english_target: string
  source: 'tatoeba' | 'wanikani' | 'admin'
  source_id: string | null
  length: number
  length_bucket: number
  tokens: SentenceToken[]
  is_review: boolean
}

export interface PracticeSession {
  id: number
  session_type: 'item' | 'sentence'
  practice_mode: string
  total_questions: number
  correct_count: number
  incorrect_count: number
  status: 'in_progress' | 'completed' | 'abandoned'
  started_at: string
  completed_at: string | null
  accuracy: number
}

export interface SetupParams {
  session_type: 'item' | 'sentence'
  item_types?: string[]
  levels?: number[]
  count?: number
  practice_mode?: string
  review_order?: string
  scope_type?: 'level' | 'subject_ids' | 'all_eligible'
  subject_ids?: number[]
  stage_filter?: string
  mix_mode?: string
}

export interface VocabBreakdownEntry {
  subject_id: number
  characters: string
  reading: string | null
  meaning: string | null
  is_target: boolean
}

export interface SrsChange {
  previous: string
  current: string
  direction: 'promoted' | 'demoted'
}

export interface AnswerResponse {
  correct: boolean
  expected: { primary: string; accepted: string[] }
  subject: {
    id: number
    characters: string
    type: string
    level: number
    meanings?: Array<{ meaning: string; primary: boolean; accepted_answer: boolean }>
    readings?: Array<{ reading: string; primary: boolean; accepted_answer: boolean }>
    meaning?: string
    reading?: string
    phrase?: {
      id: number
      japanese: string
      english: string
      source: string
      source_id: string | null
    }
  }
  next_question: PracticeQuestion | SentenceQuestion | null
  is_last: boolean
  progress: { answered: number; total: number; correct: number; wrong: number }
  srs_change?: SrsChange | null
  vocab_breakdown?: VocabBreakdownEntry[]
}

export interface SessionSummary {
  session: PracticeSession
  summary: {
    total: number
    correct: number
    wrong: number
    accuracy: number
    duration_seconds: number
    wrong_items: Array<{
      subject_id: number
      characters: string
      type: string
      level: number
      question_type: string
      user_answer: string
      expected: { primary: string; accepted: string[] }
    }>
    srs_changes?: { promoted: number; demoted: number; unchanged: number }
  }
  setup_params?: SetupParams
}

export type PracticeMode = 'kanji_to_meaning' | 'kanji_to_reading' | 'mixed'
export type ItemType = 'radical' | 'kanji' | 'vocabulary'
export type ReviewOrder = 'random' | 'weakest_first' | 'newest_first' | 'oldest_first'

export type SentenceScopeType = 'level' | 'subject_ids' | 'all_eligible'
export type StageFilter = 'all' | 'apprentice_only' | 'guru_plus'
export type MixMode = 'new_only' | 'review_only' | 'mix'

export interface EligibleSubject {
  subject_id: number
  characters: string
  type: 'kanji' | 'vocabulary'
  level: number
  meaning: string
  reading: string | null
  phrase_count: number
  local_stage: number | null
  stage_label: string | null
}
