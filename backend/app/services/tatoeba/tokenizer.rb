module Tatoeba
  # Wraps MeCab to extract dictionary forms from Japanese text.
  # MeCab returns each token along with its part-of-speech and base form (lemma).
  #
  # Example:
  #   "毎日りんごを食べました" -> ["毎日", "りんご", "を", "食べる", "ました"]
  #   The "ました" is auxiliary and gets filtered out.
  #
  # We return only content words (nouns, verbs, adjectives) in their base forms,
  # which is what we need to match against WaniKani subject characters.
  class Tokenizer
    CONTENT_POS = %w[名詞 動詞 形容詞 副詞].freeze # noun, verb, adjective, adverb

    def initialize(logger: Rails.logger)
      @logger = logger
      @tagger = MeCab::Tagger.new("-Ochasen")
    end

    # Returns an array of dictionary forms (lemmas) for content words in the text.
    # Surface forms (the actual word as it appears) are also returned for kanji matching.
    def dictionary_forms(text)
      forms = []
      node = @tagger.parseToNode(text)

      while node
        next_node = node.next
        next_node, node = node, next_node # advance, then process previous

        # Skip BOS/EOS markers (they have empty surface)
        if node.surface.nil? || node.surface.empty?
          node = next_node
          next
        end

        features = node.feature.split(",")
        pos = features[0]

        if CONTENT_POS.include?(pos)
          surface = node.surface
          base = features[6] # MeCab puts the lemma in feature[6], or "*" if same as surface

          forms << surface
          forms << base if base.present? && base != "*" && base != surface
        end

        node = next_node
      end

      forms.uniq
    rescue StandardError => e
      @logger.warn "[Tokenizer] error parsing #{text.inspect}: #{e.message}"
      []
    end
  end
end
