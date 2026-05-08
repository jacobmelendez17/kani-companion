require "csv"

module Tatoeba
  # Reads Tatoeba's bulk CSVs, tokenizes Japanese sentences with MeCab,
  # matches them to WaniKani subjects, and inserts into the phrases table.
  #
  # Process:
  #   1. Stream sentences.csv, keep only Japanese ("jpn") and English ("eng") rows
  #   2. Stream links.csv, build map of jpn_id -> [eng_id, eng_id, ...]
  #   3. For each Japanese sentence, look up English translations
  #   4. Tokenize Japanese with MeCab to get dictionary forms (e.g. 食べました -> 食べる)
  #   5. Match dictionary forms against Subject.characters where subject_type in (kanji, vocabulary)
  #   6. Insert into phrases + phrase_subjects
  #
  # Run via: rails phrases:import_tatoeba
  class Importer
    BATCH_SIZE = 500
    MIN_JAPANESE_LENGTH = 4   # Skip ultra-short fragments like "はい"
    MAX_JAPANESE_LENGTH = 80  # Skip very long sentences (rare, hard to translate)
    MIN_ENGLISH_LENGTH  = 3

    def initialize(sentences_path:, links_path:, logger: Rails.logger)
      @sentences_path = sentences_path
      @links_path     = links_path
      @logger         = logger
      @stats = {
        japanese_found:    0,
        english_found:     0,
        pairs_built:       0,
        phrases_inserted:  0,
        subjects_matched:  0,
        skipped_no_trans:  0,
        skipped_no_match:  0,
        skipped_too_short: 0,
        skipped_too_long:  0
      }
    end

    def call
      @logger.info "[Tatoeba] Starting import"
      check_mecab_available!

      jp_sentences = load_japanese_sentences
      en_sentences = load_english_sentences
      links        = load_links(jp_ids: jp_sentences.keys.to_set, en_ids: en_sentences.keys.to_set)

      tokenizer    = Tokenizer.new(logger: @logger)
      subject_map  = build_subject_map # {dictionary_form => [subject_id, ...]}

      @logger.info "[Tatoeba] Loaded #{jp_sentences.size} jpn / #{en_sentences.size} eng / #{links.size} links"
      @logger.info "[Tatoeba] Built subject map of #{subject_map.size} entries"

      buffer = []
      jp_sentences.each_with_index do |(jp_id, japanese), idx|
        translations = links[jp_id]&.map { |eng_id| en_sentences[eng_id] }&.compact
        if translations.blank?
          @stats[:skipped_no_trans] += 1
          next
        end

        if japanese.length < MIN_JAPANESE_LENGTH
          @stats[:skipped_too_short] += 1
          next
        end

        if japanese.length > MAX_JAPANESE_LENGTH
          @stats[:skipped_too_long] += 1
          next
        end

        # Tokenize and find matching subjects
        forms = tokenizer.dictionary_forms(japanese)
        matched_subject_ids = forms.flat_map { |f| subject_map[f] || [] }.uniq

        if matched_subject_ids.empty?
          @stats[:skipped_no_match] += 1
          next
        end

        # Pick the english translation closest in length to the japanese
        # (typically the most natural/idiomatic one)
        english = translations.min_by { |e| (e.length - japanese.length).abs }

        next if english.length < MIN_ENGLISH_LENGTH

        buffer << build_phrase_attrs(jp_id, japanese, english, matched_subject_ids)

        if buffer.size >= BATCH_SIZE
          flush_buffer(buffer)
          buffer.clear
        end

        @logger.info "[Tatoeba] Processed #{idx + 1}/#{jp_sentences.size} (#{@stats[:phrases_inserted]} inserted)" if (idx + 1) % 5000 == 0
      end

      flush_buffer(buffer) if buffer.any?

      @logger.info "[Tatoeba] Import complete:"
      @stats.each { |k, v| @logger.info "  #{k}: #{v}" }
      @stats
    end

    private

    def check_mecab_available!
      require "mecab"
    rescue LoadError
      raise "MeCab is not installed. On macOS: `brew install mecab mecab-ipadic`, then `bundle add mecab`. " \
            "On Linux: `apt-get install mecab libmecab-dev mecab-ipadic-utf8`."
    end

    # Returns {sentence_id (Integer) => text (String)} for all Japanese rows
    def load_japanese_sentences
      load_lang("jpn", :japanese_found)
    end

    def load_english_sentences
      load_lang("eng", :english_found)
    end

    def load_lang(lang_code, stat_key)
      sentences = {}
      File.foreach(@sentences_path) do |line|
        # Tatoeba sentences.csv format: id\tlang\ttext
        parts = line.split("\t", 3)
        next unless parts.size == 3 && parts[1] == lang_code

        text = parts[2].chomp
        next if text.blank?

        sentences[parts[0].to_i] = text
        @stats[stat_key] += 1
      end
      sentences
    end

    # Returns {jp_id => [eng_id, eng_id, ...]} only for relevant ids
    def load_links(jp_ids:, en_ids:)
      links = Hash.new { |h, k| h[k] = [] }
      File.foreach(@links_path) do |line|
        a, b = line.chomp.split("\t").map(&:to_i)
        next unless a && b

        if jp_ids.include?(a) && en_ids.include?(b)
          links[a] << b
        elsif jp_ids.include?(b) && en_ids.include?(a)
          links[b] << a
        end
      end
      links
    end

    # Builds a hash from `Subject.characters` (and lemma variants) to subject ids.
    # We match on:
    #   - `characters` exactly (e.g. "食べる")
    #   - For kanji subjects, single-char matching is implicit via tokenizer surface forms
    def build_subject_map
      map = Hash.new { |h, k| h[k] = [] }
      Subject.where(subject_type: %w[kanji vocabulary])
             .pluck(:id, :characters)
             .each do |id, chars|
        next if chars.blank?

        map[chars] << id
      end
      map
    end

    def build_phrase_attrs(tatoeba_id, japanese, english, subject_ids)
      length = japanese.length
      {
        japanese:      japanese,
        english:       english,
        source:        "tatoeba",
        source_id:     tatoeba_id.to_s,
        length:        length,
        length_bucket: Phrase.bucket_for(length),
        has_furigana:  false, # Tatoeba doesn't provide readings
        subject_ids:   subject_ids
      }
    end

    def flush_buffer(buffer)
      Phrase.transaction do
        buffer.each do |attrs|
          subject_ids = attrs.delete(:subject_ids)

          phrase = Phrase.find_or_create_by(
            source:    attrs[:source],
            source_id: attrs[:source_id]
          ) do |p|
            p.assign_attributes(attrs)
          end

          # Update if the row pre-existed (e.g. on re-import)
          phrase.update!(attrs) if phrase.persisted? && phrase.changed?

          subject_ids.each_with_index do |sid, i|
            PhraseSubject.find_or_create_by(phrase: phrase, subject_id: sid) do |ps|
              ps.is_primary = (i == 0)
            end
          end

          @stats[:phrases_inserted] += 1
          @stats[:subjects_matched] += subject_ids.size
        end
      end
    end
  end
end
