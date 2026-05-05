module Wanikani
  # Extracts context_sentences from already-synced WaniKani subjects and stores
  # them in the phrases table. WK provides them as part of vocabulary subject data:
  #
  #   subject.context_sentences = [
  #     { "ja" => "毎日リンゴを食べる。", "en" => "I eat apples every day." },
  #     { "ja" => "...", "en" => "..." }
  #   ]
  #
  # We import them as source: "wanikani" with source_id: "{subject_id}-{index}"
  # and link them to the source subject as the primary target.
  #
  # Run via: rails phrases:import_wanikani
  # Or called automatically as a step in WanikaniSyncJob after subjects are synced.
  class ContextSentenceImporter
    def initialize(logger: Rails.logger)
      @logger = logger
      @stats = { phrases_inserted: 0, subjects_processed: 0, skipped_empty: 0 }
    end

    def call
      @logger.info "[WK Context Sentences] Starting import"

      Subject.where(subject_type: "vocabulary")
             .where.not(context_sentences: [nil, [], "[]"])
             .find_each(batch_size: 200) do |subject|
        process_subject(subject)
        @stats[:subjects_processed] += 1
      end

      @logger.info "[WK Context Sentences] Import complete:"
      @stats.each { |k, v| @logger.info "  #{k}: #{v}" }
      @stats
    end

    def process_subject(subject)
      sentences = parse_context_sentences(subject)

      sentences.each_with_index do |entry, idx|
        japanese = entry["ja"]
        english  = entry["en"]
        next if japanese.blank? || english.blank?

        length = japanese.length

        Phrase.transaction do
          phrase = Phrase.find_or_create_by(
            source:    "wanikani",
            source_id: "#{subject.id}-#{idx}"
          ) do |p|
            p.japanese      = japanese
            p.english       = english
            p.length        = length
            p.length_bucket = Phrase.bucket_for(length)
            p.has_furigana  = false # WK doesn't provide per-token readings; we'll generate at render time
          end

          # Update if changed (in case WK updated the sentence)
          phrase.update!(
            japanese:      japanese,
            english:       english,
            length:        length,
            length_bucket: Phrase.bucket_for(length)
          ) if phrase.changed?

          PhraseSubject.find_or_create_by(phrase: phrase, subject: subject) do |ps|
            ps.is_primary = true
          end

          @stats[:phrases_inserted] += 1
        end
      end
    rescue StandardError => e
      @logger.warn "[WK Context Sentences] error processing subject #{subject.id}: #{e.message}"
    end

    private

    def parse_context_sentences(subject)
      raw = subject.context_sentences
      return raw if raw.is_a?(Array)

      JSON.parse(raw.to_s)
    rescue JSON::ParserError
      []
    end
  end
end
