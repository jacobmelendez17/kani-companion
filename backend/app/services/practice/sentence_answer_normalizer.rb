module Practice
  # Lenient matcher for English sentence translations.
  #
  # Tolerances:
  #   - Case insensitive
  #   - Articles (a/an/the) optional
  #   - Punctuation ignored (.,!?'"`)
  #   - Whitespace normalized (multiple spaces -> one)
  #   - Common contractions ("I'm" / "I am")
  #   - Trailing/leading whitespace
  #
  # Usage:
  #   SentenceAnswerNormalizer.match?("i eat an apple", target: "I eat an apple.")
  #   SentenceAnswerNormalizer.match?("I eat apples", target: "I eat an apple")  # close, may not match
  class SentenceAnswerNormalizer
    ARTICLES = %w[a an the].freeze
    PUNCTUATION = /[\.,!?'"`;:\-—–()\[\]{}]/

    # Levenshtein-based fuzzy threshold: percentage of characters that must match
    FUZZY_THRESHOLD = 0.85

    class << self
      # Returns true if the user's answer is acceptably close to any of the targets.
      # `targets` should be an array of accepted English translations.
      def match?(user_answer, targets:)
        return false if user_answer.blank? || targets.blank?

        normalized_user = normalize(user_answer)
        return false if normalized_user.blank?

        Array(targets).any? do |target|
          normalized_target = normalize(target.to_s)
          next false if normalized_target.blank?

          # Exact match after normalization
          return true if normalized_user == normalized_target

          # Try with articles re-inserted/removed
          return true if without_articles(normalized_user) == without_articles(normalized_target)

          # Fuzzy match for typos — only for shorter answers (long sentences need higher precision)
          if normalized_target.length <= 60
            similarity = string_similarity(normalized_user, normalized_target)
            return true if similarity >= FUZZY_THRESHOLD
          end

          false
        end
      end

      def normalize(text)
        text.to_s
            .downcase
            .gsub(PUNCTUATION, " ")
            .gsub(/\s+/, " ")
            .gsub(/\bi'm\b/, "i am")
            .gsub(/\bdon't\b/, "do not")
            .gsub(/\bdoesn't\b/, "does not")
            .gsub(/\bdidn't\b/, "did not")
            .gsub(/\bcan't\b/, "cannot")
            .gsub(/\bwon't\b/, "will not")
            .gsub(/\bisn't\b/, "is not")
            .gsub(/\baren't\b/, "are not")
            .gsub(/\bwasn't\b/, "was not")
            .gsub(/\bweren't\b/, "were not")
            .gsub(/\bit's\b/, "it is")
            .gsub(/\bthat's\b/, "that is")
            .gsub(/\bhe's\b/, "he is")
            .gsub(/\bshe's\b/, "she is")
            .gsub(/\bwe're\b/, "we are")
            .gsub(/\bthey're\b/, "they are")
            .gsub(/\byou're\b/, "you are")
            .strip
      end

      def without_articles(text)
        text.split.reject { |w| ARTICLES.include?(w) }.join(" ")
      end

      # Computes 1 - (levenshtein_distance / max_length).
      # Returns 1.0 for identical strings, ~0 for completely different.
      def string_similarity(a, b)
        return 1.0 if a == b
        return 0.0 if a.empty? || b.empty?

        distance = levenshtein(a, b)
        max_len  = [a.length, b.length].max
        1.0 - (distance.to_f / max_len)
      end

      def levenshtein(a, b)
        return b.length if a.empty?
        return a.length if b.empty?

        rows = a.length + 1
        cols = b.length + 1
        # Use a 2-row rolling buffer to save memory
        prev_row = (0...cols).to_a
        curr_row = Array.new(cols, 0)

        (1...rows).each do |i|
          curr_row[0] = i
          (1...cols).each do |j|
            cost = a[i - 1] == b[j - 1] ? 0 : 1
            curr_row[j] = [
              curr_row[j - 1] + 1,
              prev_row[j] + 1,
              prev_row[j - 1] + cost
            ].min
          end
          prev_row, curr_row = curr_row, prev_row
        end

        prev_row[cols - 1]
      end
    end
  end
end
