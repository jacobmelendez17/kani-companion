class Assignment < ApplicationRecord
  belongs_to :user
  belongs_to :subject

  validates :wanikani_id, presence: true, uniqueness: true

  # WaniKani SRS stages:
  #  0           — Locked
  #  1-4         — Apprentice I-IV
  #  5-6         — Guru I-II
  #  7           — Master
  #  8           — Enlightened
  #  9           — Burned
  scope :guru_or_above, -> { where("srs_stage >= ? OR passed_at IS NOT NULL", 5) }
  scope :unlocked, -> { where("srs_stage > ?", 0) }
end
