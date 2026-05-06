module Practice
  # Builds a sentence practice session.
  #
  # Key behaviors:
  #   - Full WK-style SRS gating: items in local SRS only appear if they're DUE
  #     (next_review_at is null or in the past). Gated (early) items are excluded.
  #   - Admin-ordered phrases: each subject can have phrases manually ordered via
  #     phrase_subjects.position. We pick phrases in that order. NULL positions
  #     come last and are picked randomly.
  #   - Stage-appropriate length: stricter brackets — Apprentice gets the shortest,
  #     Guru+ gets fuller sentences.
  class SentenceSessionBuilder
    attr_reader :user, :scope, :stage_filter, :mix_mode, :count

    APPRENTICE_STAGES = (1..4).to_a.freeze
    GURU_PLUS_STAGES  = (5..9).to_a.freeze

    STAGE_LENGTH_BRACKETS = {
      1 => [0, 8],
      2 => [0, 12],
      3 => [0, 18],
      4 => [0, 25],
      5 => [10, 35],
      6 => [12, 45],
      7 => [15, 60],
      8 => [20, 80],
      9 => [20, 80]
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

      # CRITICAL CHANGE: Filter review subjects by gate.
      # Items that haven't reached their next_review_at are excluded entirely.
      review_subjects = candidate_subjects.select do |s|
        srs = existing_srs[s.id]
        srs && srs.due?
      end

      # Apply stage filter to the (now gated-aware) review pool
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

    # Phrase selection rules (per design):
    #   1. Within the appropriate length bracket for the stage:
    #      a. Use admin-ordered phrases first (lowest position first)
    #      b. Fall back to random unordered phrases
    #   2. If nothing in bracket: use admin order across all lengths
    #   3. Worst case: shortest available phrase
    def pick_phrase_for(subject, stage)
      min_len, max_len = STAGE_LENGTH_BRACKETS[stage] || [0, 200]

      # Get all phrases linked to this subject, ordered by admin position
      ordered_phrases = subject.phrase_subjects.ordered.includes(:phrase).map(&:phrase)

      in_bracket_ordered = ordered_phrases.select do |p|
        p.length.between?(min_len, max_len)
      end

      if in_bracket_ordered.any?
        # Prefer the lowest-positioned phrase in the bracket. If multiple have the
        # same position (or all are NULL), shuffle just those at the same level.
        first_with_position = subject.phrase_subjects.ordered.includes(:phrase)
                                    .find { |ps| ps.phrase.length.between?(min_len, max_len) && ps.position.present? }
        return first_with_position.phrase if first_with_position

        # All in bracket are unordered — random pick is fine
        return in_bracket_ordered.sample
      end

      # No phrase in bracket — fall back to any phrase, prefer admin-ordered first
      first_ordered = subject.phrase_subjects.ordered.includes(:phrase)
                            .find { |ps| ps.position.present? }
      return first_ordered.phrase if first_ordered

      # Worst case: shortest unordered phrase
      ordered_phrases.min_by(&:length)
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
