class PracticeAnswer < ApplicationRecord
  belongs_to :practice_session
  belongs_to :subject

  validates :question_type, inclusion: { in: %w[meaning reading] }

  before_create :set_answered_at

  private

  def set_answered_at
    self.answered_at ||= Time.current
  end
end
