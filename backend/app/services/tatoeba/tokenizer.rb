module Tatoeba
  # Wraps MeCab to return rich token data for sentence rendering on the frontend.
  #
  # Two distinct uses:
  #   1. dictionary_forms(text)  — quick path used during Tatoeba ingestion (returns just lemmas)
  #   2. annotate(text, user:)   — rich path used at session render time
  #                                Returns array of:
  #                                  { surface, reading_hira, dictionary_form,
  #                                    pos, is_kanji_bearing, subject_id, subject_info }
  #
  # Each entry's `subject_info` is populated when the token (in surface form OR base form)
  # matches a Subject's `characters` field for kanji/vocabulary types. The user param is
  # used to determine if the user has unlocked that WK item.
  #
  # Reading conversion: MeCab returns readings in KATAKANA via the feature[7] slot.
  # We convert to hiragana for display alongside kanji.
  class Tokenizer
    CONTENT_POS = %w[名詞 動詞 形容詞 副詞].freeze

    def initialize(logger: Rails.logger)
      @logger = logger
      @tagger = MeCab::Tagger.new("-Ochasen")
    end

    # Quick path for ingestion
    def dictionary_forms(text)
      forms = []
      walk_nodes(text) do |node, features|
        pos = features[0]
        next unless CONTENT_POS.include?(pos)

        forms << node.surface
        base = features[6]
        forms << base if base.present? && base != "*" && base != node.surface
      end
      forms.uniq
    rescue StandardError => e
      @logger.warn "[Tokenizer] error parsing #{text.inspect}: #{e.message}"
      []
    end

    # Rich annotation for rendering. Returns ordered list of token hashes.
    #
    # Performance note: this looks up subjects in a single batch query at the end,
    # not per-token, to avoid N+1.
    def annotate(text, user: nil)
      tokens = []
      walk_nodes(text) do |node, features|
        pos     = features[0]
        base    = features[6]
        reading = features[7] # katakana reading

        tokens << {
          surface:         node.surface,
          dictionary_form: (base.present? && base != "*") ? base : node.surface,
          reading_kata:    (reading.present? && reading != "*") ? reading : nil,
          reading_hira:    reading_to_hiragana(reading),
          pos:             pos,
          is_kanji:        contains_kanji?(node.surface),
          subject_id:      nil,
          subject_info:    nil
        }
      end

      attach_subject_info!(tokens, user: user)
      tokens
    rescue StandardError => e
      @logger.warn "[Tokenizer] annotate failed for #{text.inspect}: #{e.message}"
      # Fallback: return one big "token" so the sentence still renders
      [{
        surface:         text,
        dictionary_form: text,
        reading_kata:    nil,
        reading_hira:    nil,
        pos:             nil,
        is_kanji:        contains_kanji?(text),
        subject_id:      nil,
        subject_info:    nil
      }]
    end

    private

    def walk_nodes(text)
      node = @tagger.parseToNode(text)
      while node
        nxt = node.next
        if node.surface && !node.surface.empty?
          features = node.feature.split(",")
          yield node, features
        end
        node = nxt
      end
    end

    def contains_kanji?(s)
      return false if s.blank?

      s.each_char.any? { |c| c.match?(/\p{Han}/) }
    end

    # Convert a katakana reading like "タベル" to hiragana "たべる"
    def reading_to_hiragana(katakana)
      return nil if katakana.blank? || katakana == "*"

      katakana.tr("ァ-ン", "ぁ-ん")
    end

    # Single batch query to populate subject_id + subject_info for any tokens
    # that match a Subject by `characters` (surface OR dictionary form).
    def attach_subject_info!(tokens, user:)
      candidate_strings = tokens.flat_map { |t| [t[:surface], t[:dictionary_form]] }.uniq.reject(&:blank?)
      return if candidate_strings.empty?

      subjects = Subject.where(subject_type: %w[kanji vocabulary], characters: candidate_strings)
                       .index_by(&:characters)

      # If a user is provided, see which subjects they've unlocked
      unlocked_ids =
        if user
          Assignment.where(user: user, subject_id: subjects.values.map(&:id))
                    .where("srs_stage > 0")
                    .pluck(:subject_id)
                    .to_set
        else
          Set.new
        end

      tokens.each do |t|
        match = subjects[t[:surface]] || subjects[t[:dictionary_form]]
        next unless match

        t[:subject_id]   = match.id
        t[:subject_info] = {
          id:         match.id,
          characters: match.characters,
          type:       match.subject_type,
          level:      match.level,
          meaning:    match.primary_meaning,
          reading:    match.primary_reading,
          unlocked:   unlocked_ids.include?(match.id)
        }
      end
    end
  end
end
