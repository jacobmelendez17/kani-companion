class ChangelogEntry < ApplicationRecord
  VALID_CHANGE_TYPES = %w[added fixed changed removed].freeze

  validates :version,      presence: true
  validates :release_date, presence: true
  validates :changes,      presence: true

  validate :changes_format

  scope :published, -> { where(published: true).order(position: :asc, release_date: :desc) }

  private

  def changes_format
    return unless changes.is_a?(Array)

    changes.each do |c|
      unless c.is_a?(Hash) && VALID_CHANGE_TYPES.include?(c["type"]) && c["text"].present?
        errors.add(:changes, "each entry must have a valid type and non-blank text")
        break
      end
    end
  end
end
