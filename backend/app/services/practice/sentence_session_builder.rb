module Practice
  # Builds a sentence practice session by:
  #   1. Resolving the user's "scope" into a candidate subject pool
  #   2. Filtering by stage (apprentice / guru+ / all)
  #   3. Mixing new (untouched) vs. review (in local SRS) items
  #   4. For each subject, picking an appropriate phrase based on its current stage
  #   5. Annotating each phrase with token data (surface + reading + WK subject info)
  #
  # Returns: array of question hashes ready to feed the practice flow.
  class SentenceSessionBuilder
    attr_reader :user, :scope, :stage_filter, :mix_mode, :count

    APPRENTICE_STAGES = (1..4).to_a.freeze
    GURU_PLUS_STAGES  = (5..9).to_a.freeze

    # Length brackets in characters — stricter than before per user feedback.
    # Apprentice gets the absolute simplest content available.
    STAGE_LENGTH_BRACKETS = {
      1 => [0, 8],   # Apprentice 1: tiny phrases
      2 => [0, 12],  # Apprentice 2: very short
      3 => [0, 18],  # Apprentice 3: short
      4 => [0, 25],  # Apprentice 4: short-medium
      5 => [10, 35], # Guru 1: medium
      6 => [12, 45], # Guru 2: medium
      7 => [15, 60], # Master: medium-long
      8 => [20, 80], # Enlightened: long
      9 => [20, 80]  # Burned: long
    }.freeze

    def initialize(user:, scope:, stage_filter:, mix_mode:, count:)
      @user         = user
      @scope        = scope
      @stage_filter = stage_filter
      @mix_mode     = mix_mode
      @count        = count
    end

    def call
      candidate_subjects = resolve_scope
      return [] if candidate_subjects.empty?

      existing_srs = LocalSrsState.where(
        user:          user,
        subject_id:    candidate_subjects.map(&:id),
        practice_kind: "sentence"
      ).index_by(&:subject_id)

      new_subjects    = candidate_subjects.reject { |s| existing_srs[s.id] }
      review_subjects = candidate_subjects.select { |s| existing_srs[s.id] }
      review_subjects = filter_by_stage(review_subjects, existing_srs)

      picked_subjects = pick_subjects(new_subjects, review_subjects)
      build_questions(picked_subjects, existing_srs)
    end

    private

    def resolve_scope
      base = Subject.guru_plus_for(user).where(subject_type: %w[kanji vocabulary])

      case scope[:type]
      when "level"
        base.where(level: scope[:levels])
      when "subject_ids"
        base.where(id: scope[:subject_ids])
      when "all_eligible"
        base
      else
        Subject.none
      end.distinct.to_a
    end

    def filter_by_stage(review_subjects, srs_map)
      stages = case stage_filter
               when "apprentice_only" then APPRENTICE_STAGES
               when "guru_plus"       then GURU_PLUS_STAGES
               when "all", nil        then nil
               when Hash              then stage_filter[:stages]
               end
      return review_subjects unless stages

      review_subjects.select { |s| stages.include?(srs_map[s.id].stage_before_type_cast) }
    end

    def pick_subjects(new_subjects, review_subjects)
      target_count = count
      case mix_mode
      when "new_only"
        new_subjects.shuffle.first(target_count)
      when "review_only"
        review_subjects.shuffle.first(target_count)
      when "mix"
        new_target = (target_count * 0.7).round
        review_target = target_count - new_target
        new_picks = new_subjects.shuffle.first(new_target)
        review_picks = review_subjects.shuffle.first(review_target)

        deficit = target_count - new_picks.size - review_picks.size
        if deficit > 0
          extras = (new_subjects - new_picks).shuffle +
                   (review_subjects - review_picks).shuffle
          (new_picks + review_picks + extras.first(deficit)).shuffle
        else
          (new_picks + review_picks).shuffle
        end
      else
        []
      end
    end

    def build_questions(subjects, srs_map)
      tokenizer = ::Tatoeba::Tokenizer.new

      subjects.filter_map do |subject|
        srs = srs_map[subject.id]
        stage = srs&.stage_before_type_cast || 1

        phrase = pick_phrase_for(subject, stage)
        next nil unless phrase

        # Annotate the phrase with token data so the frontend can render hover-able chunks
        tokens = tokenizer.annotate(phrase.japanese, user: user)

        {
          subject_id:       subject.id,
          phrase_id:        phrase.id,
          subject_type:     subject.subject_type,
          level:            subject.level,
          characters:       subject.characters,
          target_meaning:   subject.primary_meaning,
          target_reading:   subject.primary_reading,
          stage:            stage,
          stage_label:      stage_label(stage),
          japanese:         phrase.japanese,
          english_target:   phrase.english,
          source:           phrase.source,
          source_id:        phrase.source_id,
          length:           phrase.length,
          length_bucket:    phrase.length_bucket,
          tokens:           tokens,
          is_review:        !srs.nil?
        }
      end
    end

    # Pick a phrase whose length fits the stage's allowed bracket.
    # Prefers exact bracket match, then any phrase, then nil.
    #
    # At Guru+ we prefer WK context_sentences (higher quality, item-specific).
    # At Apprentice we prefer the shortest available phrases regardless of source.
    def pick_phrase_for(subject, stage)
      min_len, max_len = STAGE_LENGTH_BRACKETS[stage] || [0, 200]

      candidates = subject.phrases.to_a

      if stage >= 5
        # Guru+: prefer WK
        wk_in_bracket = candidates.select { |p| p.source == "wanikani" && fits?(p, min_len, max_len) }
        return wk_in_bracket.sample if wk_in_bracket.any?

        wk_any = candidates.select { |p| p.source == "wanikani" }
        return wk_any.sample if wk_any.any?
      end

      # All stages: try matching length bracket first
      in_bracket = candidates.select { |p| fits?(p, min_len, max_len) }
      return in_bracket.sample if in_bracket.any?

      # Fall back to shortest available — beats nothing
      candidates.min_by(&:length)
    end

    def fits?(phrase, min_len, max_len)
      phrase.length >= min_len && phrase.length <= max_len
    end

    def stage_label(stage)
      case stage
      when 1..4 then "APPRENTICE #{stage}"
      when 5..6 then "GURU #{stage - 4}"
      when 7    then "MASTER"
      when 8    then "ENLIGHTENED"
      when 9    then "BURNED"
      end
    end
  end
end
