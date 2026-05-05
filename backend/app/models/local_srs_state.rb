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

  INTERVALS = {
    1 => 4,
    2 => 8,
    3 => 24,
    4 => 48,
    5 => 24 * 7,
    6 => 24 * 14,
    7 => 24 * 30,
    8 => 24 * 120,
    9 => nil
  }.freeze

  def next_review_in
    INTERVALS[stage_before_type_cast]
  end

  # Promote on correct answer, increment streak
  def promote!
    return if stage_burned?

    new_stage = [stage_before_type_cast + 1, 9].min
    update!(
      stage:            new_stage,
      current_streak:   current_streak + 1,
      last_reviewed_at: Time.current,
      next_review_at:   INTERVALS[new_stage] ? Time.current + INTERVALS[new_stage].hours : nil
    )
  end

  # Demote on wrong answer, reset streak
  def demote!
    new_stage = [stage_before_type_cast - 2, 1].max
    update!(
      stage:            new_stage,
      current_streak:   0,
      last_reviewed_at: Time.current,
      next_review_at:   INTERVALS[new_stage] ? Time.current + INTERVALS[new_stage].hours : nil
    )
  end
end
