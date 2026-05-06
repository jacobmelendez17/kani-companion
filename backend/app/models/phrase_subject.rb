class PhraseSubject < ApplicationRecord
  belongs_to :phrase
  belongs_to :subject

  validates :subject_id, uniqueness: { scope: :phrase_id }

  # Phrases ordered by admin position (lowest first), with NULLs treated as last.
  # Within the same position (or among NULL-positioned phrases), order is stable
  # via id to keep test/output deterministic.
  scope :ordered, -> {
    order(Arel.sql("position IS NULL"))
      .order(:position)
      .order(:id)
  }
end
