class Phrase < ApplicationRecord
  has_many :phrase_subjects, dependent: :destroy
  has_many :subjects, through: :phrase_subjects

  enum :source, {
    tatoeba:  "tatoeba",
    wanikani: "wanikani",
    admin:    "admin"
  }, prefix: true, validate: true

  validates :japanese, :english, :length, presence: true
  validates :length_bucket, inclusion: { in: 0..2 }

  # Length buckets used for picking phrases by stage:
  #   0 = short (<10 chars) — Apprentice 1-2
  #   1 = medium (10-25 chars) — Apprentice 3-4
  #   2 = long (>25 chars) — Guru+
  SHORT_MAX  = 10
  MEDIUM_MAX = 25

  def self.bucket_for(length)
    return 0 if length < SHORT_MAX
    return 1 if length < MEDIUM_MAX
    2
  end

  # Returns the primary target subject (the one this phrase was indexed for)
  def primary_subject
    phrase_subjects.find_by(is_primary: true)&.subject || subjects.first
  end

  # Returns parsed furigana data for WK sentences, or nil for Tatoeba
  # Format: [["毎日", "まいにち"], ["りんご", null], ["を", null], ["食べる", "たべる"]]
  def furigana_pairs
    return nil unless has_furigana && furigana_data.present?

    JSON.parse(furigana_data)
  rescue JSON::ParserError
    nil
  end
end
