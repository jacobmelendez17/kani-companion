class PracticeSession < ApplicationRecord
  belongs_to :user
  has_many :practice_answers, dependent: :destroy

  enum :session_type, { item: "item", sentence: "sentence" }, prefix: true
  enum :status, {
    in_progress: "in_progress",
    completed:   "completed",
    abandoned:   "abandoned"
  }, prefix: true

  validates :session_type, presence: true

  before_create :set_started_at

  def accuracy
    return 0.0 if total_questions.to_i.zero?

    (correct_count.to_f / total_questions * 100).round(1)
  end

  def complete!
    update!(status: "completed", completed_at: Time.current)
  end

  private

  def set_started_at
    self.started_at ||= Time.current
  end
end
