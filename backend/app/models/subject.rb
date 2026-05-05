class Subject < ApplicationRecord
  has_many :assignments, dependent: :destroy
  has_many :study_materials, dependent: :destroy
  has_many :local_srs_states, dependent: :destroy
  has_many :phrase_subjects, dependent: :destroy
  has_many :phrases, through: :phrase_subjects

  enum :subject_type, {
    radical:    "radical",
    kanji:      "kanji",
    vocabulary: "vocabulary"
  }, prefix: true, validate: true

  scope :guru_plus_for, ->(user) {
    joins(:assignments)
      .where(assignments: { user_id: user.id })
      .where("assignments.srs_stage >= ? OR assignments.passed_at IS NOT NULL", 5)
  }

  def primary_meaning
    return nil unless meanings.is_a?(Array)

    primary = meanings.find { |m| m["primary"] }
    primary&.dig("meaning") || meanings.first&.dig("meaning")
  end

  def primary_reading
    return nil unless readings.is_a?(Array)

    primary = readings.find { |r| r["primary"] }
    primary&.dig("reading") || readings.first&.dig("reading")
  end

  def all_meanings
    return [] unless meanings.is_a?(Array)

    meanings.select { |m| m["accepted_answer"] }.map { |m| m["meaning"] }
  end

  def all_readings
    return [] unless readings.is_a?(Array)

    readings.select { |r| r["accepted_answer"] }.map { |r| r["reading"] }
  end
end
