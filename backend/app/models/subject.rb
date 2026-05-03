class Subject < ApplicationRecord
  # Synced from WaniKani — represents radicals, kanji, vocabulary
  has_many :assignments, dependent: :destroy
  has_many :study_materials, dependent: :destroy
  has_many :context_sentences, dependent: :destroy

  enum :subject_type, {
    radical:    "radical",
    kanji:      "kanji",
    vocabulary: "vocabulary"
  }, prefix: true

  validates :wanikani_id, presence: true, uniqueness: true
  validates :level, presence: true, numericality: { in: 1..60 }
  validates :subject_type, presence: true

  scope :by_levels, ->(levels) { where(level: levels) }
  scope :of_types, ->(types) { where(subject_type: types) }

  # Stored as JSONB:
  # - meanings: [{ meaning, primary, accepted }]
  # - readings: [{ reading, primary, accepted, type }]  (kanji/vocab only)
  # - parts_of_speech, characters, etc.

  def primary_meaning
    meanings&.find { |m| m["primary"] }&.dig("meaning")
  end

  def primary_reading
    readings&.find { |r| r["primary"] }&.dig("reading")
  end
end
