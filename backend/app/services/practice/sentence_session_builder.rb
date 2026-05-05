module Practice
  # Builds a sentence practice session by:
  #   1. Resolving the user's "scope" into a candidate subject pool
  #   2. Filtering by stage (apprentice / guru+ / all)
  #   3. Mixing new (untouched) vs. review (in local SRS) items
  #   4. For each subject, picking an appropriate phrase based on its current stage
  #
  # Returns: array of question hashes ready to feed the practice flow.
  class SentenceSessionBuilder
    attr_reader :user, :scope, :stage_filter, :mix_mode, :count

    APPRENTICE_STAGES = (1..4).to_a.freeze
    GURU_PLUS_STAGES  = (5..9).to_a.freeze

    def initialize(user:, scope:, stage_filter:, mix_mode:, count:)
      @user         = user
      @scope        = scope         # { type: "level" | "subject_ids" | "all_eligible", levels: [], subject_ids: [] }
      @stage_filter = stage_filter  # "all" | "apprentice_only" | "guru_plus" | { stages: [1,2,3] }
      @mix_mode     = mix_mode      # "new_only" | "review_only" | "mix"
      @count        = count
    end

    def call
      candidate_subjects = resolve_scope
      return [] if candidate_subjects.empty?

      # Bucket subjects by whether they're "new" (no local SRS yet) or "review" (have one)
      existing_srs = LocalSrsState.where(user: user, subject_id: candidate_subjects.map(&:id), practice_kind: "sentence")
                                  .index_by(&:subject_id)

      new_subjects    = candidate_subjects.reject { |s| existing_srs[s.id] }
      review_subjects = candidate_subjects.select { |s| existing_srs[s.id] }

      # Apply stage filter (only affects review subjects since new ones have no stage)
      review_subjects = filter_by_stage(review_subjects, existing_srs)

      # Pick subjects according to mix_mode
      picked_subjects = pick_subjects(new_subjects, review_subjects)

      # For each picked subject, pick a phrase appropriate to its stage
      build_questions(picked_subjects, existing_srs)
    end

    private

    # Returns array of Subject records that are eligible for sentence practice
    # (Guru+ in WaniKani — i.e. user has passed them in WK).
    def resolve_scope
      base = Subject.guru_plus_for(user)
                    .where(subject_type: %w[kanji vocabulary])

      case scope[:type]
      when "level"
        base.where(level: scope[:levels])
      when "subject_ids"
        base.where(id: scope[:subject_ids])
      when "all_eligible"
        base
      else
        Subject.none
      end.to_a
    end

    def filter_by_stage(review_subjects, srs_map)
      stages = case stage_filter
               when "apprentice_only" then APPRENTICE_STAGES
               when "guru_plus"       then GURU_PLUS_STAGES
               when "all", nil        then nil
               when Hash              then stage_filter[:stages]
               else nil
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
        # 70/30 split — but if one bucket is short, fill from the other
        new_target    = (target_count * 0.7).round
        review_target = target_count - new_target

        new_picks    = new_subjects.shuffle.first(new_target)
        review_picks = review_subjects.shuffle.first(review_target)

        # Backfill from whichever has surplus
        deficit = target_count - new_picks.size - review_picks.size
        if deficit > 0
          extras = (new_subjects - new_picks).shuffle.first(deficit) +
                   (review_subjects - review_picks).shuffle.first(deficit)
          (new_picks + review_picks + extras.first(deficit)).shuffle
        else
          (new_picks + review_picks).shuffle
        end
      else
        []
      end
    end

    def build_questions(subjects, srs_map)
      subjects.filter_map do |subject|
        # Determine effective stage: default Apprentice 1 if no SRS yet
        srs = srs_map[subject.id]
        stage = srs&.stage_before_type_cast || 1

        phrase = pick_phrase_for(subject, stage)
        next nil unless phrase # Skip if no phrase available

        {
          subject_id:       subject.id,
          phrase_id:        phrase.id,
          subject_type:     subject.subject_type,
          level:            subject.level,
          characters:       subject.characters,
          target_meaning:   subject.primary_meaning,
          stage:            stage,
          stage_label:      stage_label(stage),
          japanese:         phrase.japanese,
          english_target:   phrase.english,
          source:           phrase.source,
          source_id:        phrase.source_id,
          length:           phrase.length,
          length_bucket:    phrase.length_bucket,
          # Furigana data: WK can render via official readings, Tatoeba needs kuroshiro client-side
          needs_kuroshiro:  phrase.source == "tatoeba",
          is_review:        !srs.nil?
        }
      end
    end

    # Phrase selection rules:
    #   - Apprentice 1-4: Tatoeba phrases first (matched, varied length), WK fallback
    #   - Guru+: WK context_sentences first (high quality, item-specific), Tatoeba fallback
    #
    # We weight by length_bucket within stage:
    #   Apprentice 1-2 prefers short phrases (bucket 0)
    #   Apprentice 3-4 prefers medium (bucket 1)
    #   Guru+ accepts any length (with WK preference)
    def pick_phrase_for(subject, stage)
      preferred_bucket =
        case stage
        when 1..2 then 0
        when 3..4 then 1
        else 2
        end

      candidates = subject.phrases.to_a

      # If Guru+, prefer WK
      if stage >= 5
        wk = candidates.select { |p| p.source == "wanikani" }
        return wk.sample if wk.any?
      end

      # Try preferred bucket first
      bucket_match = candidates.select { |p| p.length_bucket == preferred_bucket }
      return bucket_match.sample if bucket_match.any?

      # Fall back to any phrase
      candidates.sample
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
