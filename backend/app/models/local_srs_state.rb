class LocalSrsState < ApplicationRecord
  belongs_to :user
  belongs_to :subject

  enum :stage, {
    apprentice_1: 1,
    apprentice_2: 2,
    apprentice_3: 3,
    apprentice_4: 4,
    guru_1:       5,
    guru_2:       6,
    master:       7,
    enlightened:  8,
    burned:       9
  }, prefix: true

  enum :practice_kind, {
    item:     "item",
    sentence: "sentence"
  }, prefix: true

  validates :user_id, uniqueness: { scope: %i[subject_id practice_kind] }

  # Practice-friendly intervals (faster than WaniKani's defaults).
  # Hours until next review after promoting to that stage:
  #   App 1 -> 2: 1h     App 2 -> 3: 4h     App 3 -> 4: 8h     App 4 -> Guru 1: 1d
  #   Guru 1 -> 2: 3d    Guru 2 -> Master: 1w   Master -> Enlightened: 2w
  #   Enlightened -> Burned: 1mo
  INTERVALS = {
    1 => 1,           # App 1: 1 hour gate
    2 => 4,           # App 2: 4 hours
    3 => 8,           # App 3: 8 hours
    4 => 24,          # App 4: 1 day
    5 => 24 * 3,      # Guru 1: 3 days
    6 => 24 * 7,      # Guru 2: 1 week
    7 => 24 * 14,     # Master: 2 weeks
    8 => 24 * 30,     # Enlightened: 1 month
    9 => nil          # Burned: never
  }.freeze

  def next_review_in_hours
    INTERVALS[stage_before_type_cast]
  end

  # True if this item is currently gated (waiting for next_review_at).
  # When gated, the practice flow may still allow practice but SRS won't change,
  # OR (per current setting) gated items don't appear in sessions at all.
  def gated?
    return false if next_review_at.nil?

    next_review_at > Time.current
  end

  # True if the item is due for review (next_review_at has passed OR was never set).
  def due?
    next_review_at.nil? || next_review_at <= Time.current
  end

  # Promote on a correct answer; sets next_review_at to whatever the new stage's interval is.
  def promote!
    return if stage_burned?

    new_stage = [stage_before_type_cast + 1, 9].min
    interval  = INTERVALS[new_stage]
    update!(
      stage:            new_stage,
      current_streak:   current_streak + 1,
      last_reviewed_at: Time.current,
      next_review_at:   interval ? Time.current + interval.hours : nil
    )
  end

  # Demote on a wrong answer. We drop ONE stage (per design decision) but reset the
  # next_review_at so the user can retry sooner — they didn't get it right, no point
  # waiting the full interval at the previous stage.
  def demote!
    new_stage = [stage_before_type_cast - 1, 1].max
    interval  = INTERVALS[new_stage]
    update!(
      stage:            new_stage,
      current_streak:   0,
      last_reviewed_at: Time.current,
      next_review_at:   interval ? Time.current + interval.hours : nil
    )
  end
end
