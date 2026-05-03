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
    item:     "item",     # kanji/vocab/radical practice
    sentence: "sentence"  # sentence practice
  }, prefix: true

  validates :user_id, uniqueness: { scope: %i[subject_id practice_kind] }

  # SRS interval table (in hours) — tweakable via config
  INTERVALS = {
    1 => 4,           # Apprentice 1
    2 => 8,           # Apprentice 2
    3 => 24,          # Apprentice 3
    4 => 48,          # Apprentice 4
    5 => 24 * 7,      # Guru 1
    6 => 24 * 14,     # Guru 2
    7 => 24 * 30,     # Master
    8 => 24 * 120,    # Enlightened
    9 => nil          # Burned (retired)
  }.freeze

  def next_review_in
    INTERVALS[stage_before_type_cast]
  end

  def promote!
    return if stage_burned?

    new_stage = [stage_before_type_cast + 1, 9].min
    update!(stage: new_stage, last_reviewed_at: Time.current)
  end

  def demote!
    new_stage = [stage_before_type_cast - 2, 1].max
    update!(stage: new_stage, last_reviewed_at: Time.current)
  end
end
