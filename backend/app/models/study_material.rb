class StudyMaterial < ApplicationRecord
  belongs_to :user
  belongs_to :subject

  validates :wanikani_id, presence: true, uniqueness: true

  # JSON arrays from WaniKani:
  # - meaning_synonyms: ["man-made", "synthetic"]
  # - meaning_note, reading_note (free text)
end
