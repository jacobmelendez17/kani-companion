module Api
  module V1
    # Lightweight endpoints used by the sentence practice setup UI.
    class SentencePracticeController < BaseController
      # GET /api/v1/sentence_practice/eligible_subjects
      # Returns user's Guru+ vocab/kanji subjects, optionally filtered by level, with phrase-availability info.
      #
      # Query params:
      #   level=N                -> just that level
      #   levels=1,2,3           -> multiple levels
      #   has_phrases=true       -> only subjects with at least one phrase
      def eligible_subjects
        scope = Subject.guru_plus_for(current_user)
                       .where(subject_type: %w[kanji vocabulary])

        if params[:level].present?
          scope = scope.where(level: params[:level].to_i)
        elsif params[:levels].present?
          level_ids = params[:levels].to_s.split(",").map(&:to_i)
          scope = scope.where(level: level_ids)
        end

        # Augment with phrase counts in one query
        subjects = scope.distinct.to_a
        subject_ids = subjects.map(&:id)

        phrase_counts = PhraseSubject.where(subject_id: subject_ids)
                                     .group(:subject_id)
                                     .count

        srs_states = LocalSrsState.where(user: current_user, subject_id: subject_ids, practice_kind: "sentence")
                                  .index_by(&:subject_id)

        result = subjects.map do |s|
          phrase_count = phrase_counts[s.id] || 0
          if params[:has_phrases] == "true" && phrase_count == 0
            next nil
          end

          state = srs_states[s.id]
          {
            subject_id:    s.id,
            characters:    s.characters,
            type:          s.subject_type,
            level:         s.level,
            meaning:       s.primary_meaning,
            reading:       s.primary_reading,
            phrase_count:  phrase_count,
            local_stage:   state&.stage_before_type_cast,
            stage_label:   state ? stage_label(state.stage_before_type_cast) : nil
          }
        end.compact

        render json: { subjects: result, total: result.size }
      end

      # GET /api/v1/sentence_practice/eligibility
      # Quick summary: how many subjects per level have phrases ready
      def eligibility
        all = Subject.guru_plus_for(current_user)
                     .where(subject_type: %w[kanji vocabulary])
                     .pluck(:id, :level)

        subject_ids = all.map(&:first)

        phrase_counts = PhraseSubject.where(subject_id: subject_ids)
                                     .group(:subject_id)
                                     .count

        # Group by level: { 1 => { total: 30, with_phrases: 28 }, ... }
        by_level = all.group_by(&:last).transform_values do |rows|
          ids = rows.map(&:first)
          with_phrases = ids.count { |id| (phrase_counts[id] || 0) > 0 }
          { total: ids.size, with_phrases: with_phrases }
        end

        render json: {
          by_level: by_level,
          total_eligible: all.size,
          total_with_phrases: subject_ids.count { |id| (phrase_counts[id] || 0) > 0 }
        }
      end

      private

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
end
