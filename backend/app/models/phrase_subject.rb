class PhraseSubject < ApplicationRecord
  belongs_to :phrase
  belongs_to :subject

  validates :subject_id, uniqueness: { scope: :phrase_id }
end
