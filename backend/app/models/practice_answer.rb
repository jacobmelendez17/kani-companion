class PracticeAnswer < ApplicationRecord
  belongs_to :practice_session
  belongs_to :subject

  # Question types:
  #   meaning            — item practice: user types the English meaning of a kanji/vocab/radical
  #   reading            — item practice: user types the Japanese reading
  #   sentence_translate — sentence practice: user types the English translation of a JP sentence
  validates :question_type, inclusion: { in: %w[meaning reading sentence_translate] }

  before_create :set_answered_at

  private

  def set_answered_at
    self.answered_at ||= Time.current
  end
end
