module Practice
  # Lenient matcher for English sentence translations.
  #
  # Designed to accept "close enough" translations rather than exact matches,
  # since translation between Japanese and English is genuinely subjective.
  #
  # Tolerances (in order of attempt — return true on first match):
  #
  #   1. Exact match after normalization (case, punctuation, contractions, whitespace)
  #   2. Match after stripping articles (a/an/the)
  #   3. Match after stripping common filler words (very/really/just/quite)
  #   4. Match after singular<->plural normalization (apple == apples)
  #   5. Word-set similarity: same significant words in any order (>=80% overlap)
  #   6. Levenshtein fuzzy match: 75% similarity for any sentence
  #
  # The thresholds are tuned to be forgiving but not allow totally wrong answers.
  # E.g. "I eat apples" vs "I eat an apple" passes (plural+article).
  # "I love eating fruit" vs "I love eating fruits" passes (plural).
  # "He went home" vs "He went to school" should NOT pass (different content word).
  class SentenceAnswerNormalizer
    ARTICLES = %w[a an the].freeze
    PUNCTUATION = /[\.,!?'"`;:\-—–()\[\]{}…]/
    FILLER_WORDS = %w[very really just quite rather kind sort of so even now then].freeze

    # Common irregular plurals + special cases. Most plurals are handled by
    # simple s/es stripping below, but these need explicit mapping.
    IRREGULAR_PLURALS = {
      "men"      => "man",
      "women"    => "woman",
      "children" => "child",
      "people"   => "person",
      "feet"     => "foot",
      "teeth"    => "tooth",
      "mice"     => "mouse",
      "geese"    => "goose",
      "fish"     => "fish",
      "sheep"    => "sheep",
      "deer"     => "deer"
    }.freeze

    CONTRACTIONS = {
      /\bi'm\b/         => "i am",
      /\bi've\b/        => "i have",
      /\bi'll\b/        => "i will",
      /\bi'd\b/         => "i would",
      /\bdon't\b/       => "do not",
      /\bdoesn't\b/     => "does not",
      /\bdidn't\b/      => "did not",
      /\bcan't\b/       => "cannot",
      /\bwon't\b/       => "will not",
      /\bisn't\b/       => "is not",
      /\baren't\b/      => "are not",
      /\bwasn't\b/      => "was not",
      /\bweren't\b/     => "were not",
      /\bit's\b/        => "it is",
      /\bthat's\b/      => "that is",
      /\bhe's\b/        => "he is",
      /\bshe's\b/       => "she is",
      /\bwe're\b/       => "we are",
      /\bthey're\b/     => "they are",
      /\byou're\b/      => "you are",
      /\bwe've\b/       => "we have",
      /\bthey've\b/     => "they have",
      /\byou've\b/      => "you have",
      /\bwouldn't\b/    => "would not",
      /\bcouldn't\b/    => "could not",
      /\bshouldn't\b/   => "should not"
    }.freeze

    FUZZY_THRESHOLD       = 0.75 # 75% character similarity (was 85%)
    WORD_SET_THRESHOLD    = 0.80 # 80% of significant words must match
    SIGNIFICANT_WORD_MIN  = 3    # Words >= 3 chars count as "significant"

    class << self
      def match?(user_answer, targets:)
        return false if user_answer.blank? || targets.blank?

        normalized_user = normalize(user_answer)
        return false if normalized_user.blank?

        Array(targets).any? do |target|
          normalized_target = normalize(target.to_s)
          next false if normalized_target.blank?

          # 1. Exact match after normalization
          return true if normalized_user == normalized_target

          # 2. Articles stripped
          no_articles_user   = without_words(normalized_user, ARTICLES)
          no_articles_target = without_words(normalized_target, ARTICLES)
          return true if no_articles_user == no_articles_target

          # 3. Filler words stripped (common in casual translation)
          no_fillers_user   = without_words(no_articles_user, FILLER_WORDS)
          no_fillers_target = without_words(no_articles_target, FILLER_WORDS)
          return true if no_fillers_user == no_fillers_target

          # 4. Singular/plural normalized
          singularized_user   = singularize_words(no_fillers_user)
          singularized_target = singularize_words(no_fillers_target)
          return true if singularized_user == singularized_target

          # 5. Word-set similarity (handles word reordering)
          if word_set_similar?(singularized_user, singularized_target)
            return true
          end

          # 6. Levenshtein fuzzy match (typo tolerance)
          # Apply to normalized strings (with articles intact for typo check)
          similarity = string_similarity(normalized_user, normalized_target)
          return true if similarity >= FUZZY_THRESHOLD

          # Also try fuzzy on the article-stripped versions
          similarity_clean = string_similarity(no_articles_user, no_articles_target)
          return true if similarity_clean >= FUZZY_THRESHOLD

          false
        end
      end

      def normalize(text)
        result = text.to_s
                     .downcase
                     .gsub(PUNCTUATION, " ")
                     .gsub(/\s+/, " ")
                     .strip

        CONTRACTIONS.each { |pattern, replacement| result = result.gsub(pattern, replacement) }
        result.gsub(/\s+/, " ").strip
      end

      def without_words(text, words)
        words_set = words.to_set
        text.split.reject { |w| words_set.include?(w) }.join(" ")
      end

      # Convert plurals to their singular form within a sentence.
      # Handles common patterns:
      #   - irregular plurals via IRREGULAR_PLURALS map
      #   - words ending in -ies (cities -> city)
      #   - words ending in -es after sibilants (boxes -> box)
      #   - words ending in -s (cats -> cat)
      def singularize_words(text)
        text.split.map { |w| singularize(w) }.join(" ")
      end

      def singularize(word)
        return IRREGULAR_PLURALS[word] if IRREGULAR_PLURALS.key?(word)

        # Words too short to safely singularize
        return word if word.length <= 3

        # -ies -> y (cities -> city, but skip "ties" -> "ty")
        if word.end_with?("ies") && word.length > 4
          return word[0..-4] + "y"
        end

        # -es after sibilants -> drop -es (boxes -> box, churches -> church)
        if word =~ /(s|x|z|ch|sh)es\z/
          return word[0..-3]
        end

        # -s -> drop (cats -> cat). Skip "is", "us", words ending in "ss" like "pass".
        if word.end_with?("s") && !word.end_with?("ss") && !%w[is us has was].include?(word)
          return word[0..-2]
        end

        word
      end

      # Two strings are "word-set similar" if they share a high % of significant words
      # in any order. "I eat apples every day" vs "Every day I eat apples" -> match.
      def word_set_similar?(a, b)
        words_a = significant_words(a)
        words_b = significant_words(b)

        return false if words_a.empty? || words_b.empty?

        intersection = (words_a & words_b).size
        union        = (words_a | words_b).size
        return false if union.zero?

        # Jaccard similarity — shared significant words / total unique words
        (intersection.to_f / union) >= WORD_SET_THRESHOLD
      end

      def significant_words(text)
        text.split.select { |w| w.length >= SIGNIFICANT_WORD_MIN }.to_set
      end

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
