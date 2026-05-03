module Api
  module V1
    class DashboardController < BaseController
      def show
        profile = current_user.wanikani_profile

        render json: {
          wanikani_level:    profile&.wanikani_level,
          sync_status:       profile&.sync_status,
          last_synced_at:    profile&.last_synced_at,
          learned_kanji:     learned_count("kanji"),
          learned_vocabulary: learned_count("vocabulary"),
          sentence_eligible: sentence_eligible_count,
          weak_items:        weak_items,
          recent_mistakes:   recent_mistakes,
          daily_streak:      daily_streak,
          recommended_session: recommended_session
        }
      end

      private

      def learned_count(type)
        current_user.assignments
                    .joins(:subject)
                    .where(subjects: { subject_type: type })
                    .where("assignments.srs_stage > 0")
                    .count
      end

      def sentence_eligible_count
        current_user.assignments
                    .joins(:subject)
                    .where(subjects: { subject_type: %w[kanji vocabulary] })
                    .where("assignments.srs_stage >= ? OR assignments.passed_at IS NOT NULL", 5)
                    .count
      end

      def weak_items
        current_user.local_srs_states
                    .where(practice_kind: "item")
                    .where("incorrect_count > correct_count")
                    .order(stage: :asc, incorrect_count: :desc)
                    .limit(5)
                    .includes(:subject)
                    .map do |srs|
          {
            subject_id: srs.subject_id,
            characters: srs.subject.characters,
            stage:      srs.stage,
            accuracy:   srs.correct_count.zero? ? 0 :
                        (srs.correct_count.to_f / (srs.correct_count + srs.incorrect_count) * 100).round
          }
        end
      end

      def recent_mistakes
        PracticeAnswer.joins(:practice_session)
                      .where(practice_sessions: { user_id: current_user.id })
                      .where(correct: false)
                      .where("answered_at >= ?", 24.hours.ago)
                      .order(answered_at: :desc)
                      .limit(10)
                      .includes(:subject)
                      .map do |a|
          {
            subject_id: a.subject_id,
            characters: a.subject.characters,
            type:       a.subject.subject_type,
            answered_at: a.answered_at
          }
        end
      end

      def daily_streak
        # Count consecutive days with at least one completed session
        days = current_user.practice_sessions
                           .status_completed
                           .where("completed_at >= ?", 60.days.ago)
                           .pluck(Arel.sql("DATE(completed_at)"))
                           .uniq
                           .sort
                           .reverse
        return 0 if days.empty?

        streak = 0
        cursor = Date.current
        days.each do |d|
          if d == cursor
            streak += 1
            cursor -= 1.day
          elsif d == cursor - 1.day
            cursor = d - 1.day
            streak += 1
          else
            break
          end
        end
        streak
      end

      def recommended_session
        weak_count = current_user.local_srs_states
                                 .where(practice_kind: "item")
                                 .where("stage <= ?", 4)
                                 .count

        if weak_count >= 5
          { mode: "weakest_first", reason: "You have #{weak_count} weak items to drill" }
        elsif sentence_eligible_count >= 10
          { mode: "sentence", reason: "Try sentence practice with your #{sentence_eligible_count} eligible items" }
        else
          { mode: "random", reason: "Mixed practice across all your levels" }
        end
      end
    end
  end
end
