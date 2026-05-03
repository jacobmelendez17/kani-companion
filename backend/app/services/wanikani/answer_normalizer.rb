module Wanikani
  # Normalizes user-submitted answers and checks against accepted values.
  # Handles English meanings and Japanese readings per the brief.
  class AnswerNormalizer
    # English: trim whitespace, lowercase, strip punctuation
    def self.normalize_english(text)
      return "" if text.nil?

      text.to_s
          .strip
          .downcase
          .gsub(/[[:punct:]]/, "")
          .gsub(/\s+/, " ")
    end

    # Japanese: normalize katakana to hiragana, strip whitespace
    def self.normalize_japanese(text)
      return "" if text.nil?

      hiragana = text.to_s.tr("ァ-ヶ", "ぁ-ゖ")
      hiragana.gsub(/\s+/, "")
    end

    def self.match_meaning?(user_answer, subject:, study_material: nil)
      normalized = normalize_english(user_answer)
      return false if normalized.empty?

      accepted = []
      accepted.concat(subject.meanings.select { |m| m["accepted_answer"] }.map { |m| m["meaning"] }) if subject.meanings
      accepted.concat(study_material.meaning_synonyms) if study_material&.meaning_synonyms

      accepted.map { |m| normalize_english(m) }.include?(normalized)
    end

    def self.match_reading?(user_answer, subject:)
      normalized = normalize_japanese(user_answer)
      return false if normalized.empty?

      accepted = subject.readings&.select { |r| r["accepted_answer"] }&.map { |r| r["reading"] } || []
      accepted.map { |r| normalize_japanese(r) }.include?(normalized)
    end
  end
end
