module Api
  module V1
    class DashboardController < BaseController
      def show
        profile = current_user.wanikani_profile

        render json: {
          username:                  current_user.username,
          wanikani_level:            profile&.wanikani_level,
          wanikani_username:         profile&.wanikani_username,
          realm:                     level_realm(profile&.wanikani_level),
          sync_status:               profile&.sync_status,
          last_synced_at:            profile&.last_synced_at,
          last_sync_error:           profile&.last_sync_error,

          items_unlocked:            items_unlocked,
          level_progress_percent:    level_progress_percent(profile),
          items_remaining_to_next:   items_remaining_to_next(profile),

          learned_kanji:             learned_count("kanji"),
          learned_kanji_weekly:      learned_weekly("kanji"),
          learned_vocabulary:        learned_count("vocabulary"),
          learned_vocabulary_weekly: learned_weekly("vocabulary"),
          sentence_eligible:         sentence_eligible_count,
          sentence_eligible_weekly:  sentence_eligible_weekly,

          srs_distribution:          srs_distribution,

          daily_streak:              daily_streak,
          best_streak:               best_streak,
          streak_calendar:           streak_calendar,

          weak_items:                weak_items,
          recent_mistakes:           recent_mistakes,
          recent_mistakes_count:     recent_mistakes_count,

          recommended_session:       recommended_session
        }
      end

      private

      def level_realm(level)
        return nil unless level

        case level
        when 1..10  then { name: "PLEASANT", kanji: "快" }
        when 11..20 then { name: "PAINFUL",  kanji: "苦" }
        when 21..30 then { name: "DEATH",    kanji: "死" }
        when 31..40 then { name: "HELL",     kanji: "地獄" }
        when 41..50 then { name: "PARADISE", kanji: "天国" }
        when 51..60 then { name: "REALITY",  kanji: "現実" }
        end
      end

      def items_unlocked
        current_user.assignments.where("srs_stage > 0").count
      end

      def level_progress_percent(profile)
        return 0 unless profile&.wanikani_level

        current_kanji_ids = Subject.subject_type_kanji.where(level: profile.wanikani_level).pluck(:id)
        return 0 if current_kanji_ids.empty?

        passed = current_user.assignments
                             .where(subject_id: current_kanji_ids)
                             .where("srs_stage >= ?", 5)
                             .count

        ((passed.to_f / current_kanji_ids.size) * 100).round
      end

      def items_remaining_to_next(profile)
        return 0 unless profile&.wanikani_level

        current_kanji_ids = Subject.subject_type_kanji.where(level: profile.wanikani_level).pluck(:id)
        return 0 if current_kanji_ids.empty?

        passed = current_user.assignments
                             .where(subject_id: current_kanji_ids)
                             .where("srs_stage >= ?", 5)
                             .count

        threshold = (current_kanji_ids.size * 0.9).ceil
        [threshold - passed, 0].max
      end

      def learned_count(type)
        current_user.assignments
                    .joins(:subject)
                    .where(subjects: { subject_type: type })
                    .where("assignments.srs_stage > 0")
                    .count
      end

      def learned_weekly(type)
        current_user.assignments
                    .joins(:subject)
                    .where(subjects: { subject_type: type })
                    .where("assignments.unlocked_at >= ?", 7.days.ago)
                    .count
      end

      def sentence_eligible_count
        current_user.assignments
                    .joins(:subject)
                    .where(subjects: { subject_type: %w[kanji vocabulary] })
                    .where("assignments.srs_stage >= ? OR assignments.passed_at IS NOT NULL", 5)
                    .count
      end

      def sentence_eligible_weekly
        current_user.assignments
                    .joins(:subject)
                    .where(subjects: { subject_type: %w[kanji vocabulary] })
                    .where("(assignments.srs_stage >= 5 OR assignments.passed_at IS NOT NULL) AND assignments.passed_at >= ?", 7.days.ago)
                    .count
      end

      def srs_distribution
        scope = current_user.assignments.where("srs_stage > 0").group(:srs_stage).count
        {
          apprentice: (1..4).sum { |s| scope[s] || 0 },
          guru:       (5..6).sum { |s| scope[s] || 0 },
          master:     scope[7] || 0,
          enlightened: scope[8] || 0,
          burned:     scope[9] || 0
        }
      end

      def weak_items
        current_user.local_srs_states
                    .where(practice_kind: "item")
                    .where("(correct_count + incorrect_count) >= 3 AND incorrect_count >= correct_count")
                    .order(stage: :asc, incorrect_count: :desc)
                    .limit(5)
                    .includes(:subject)
                    .map do |srs|
          total = srs.correct_count + srs.incorrect_count
          accuracy = total.zero? ? 0 : (srs.correct_count.to_f / total * 100).round
          {
            subject_id:  srs.subject_id,
            characters:  srs.subject.characters,
            meaning:     srs.subject.primary_meaning,
            type:        srs.subject.subject_type,
            stage:       srs.stage,
            stage_label: srs.stage.to_s.humanize.titleize,
            correct:     srs.correct_count,
            total:       total,
            accuracy:    accuracy
          }
        end
      end

      def recent_mistakes
        PracticeAnswer.joins(:practice_session)
                      .where(practice_sessions: { user_id: current_user.id })
                      .where(correct: false)
                      .where("answered_at >= ?", 24.hours.ago)
                      .order(answered_at: :desc)
                      .limit(12)
                      .includes(:subject)
                      .map do |a|
          {
            subject_id:  a.subject_id,
            characters:  a.subject.characters,
            meaning:     a.subject.primary_meaning,
            type:        a.subject.subject_type,
            answered_at: a.answered_at,
            hours_ago:   ((Time.current - a.answered_at) / 3600).round
          }
        end
      end

      def recent_mistakes_count
        PracticeAnswer.joins(:practice_session)
                      .where(practice_sessions: { user_id: current_user.id })
                      .where(correct: false)
                      .where("answered_at >= ?", 24.hours.ago)
                      .count
      end

      def streak_calendar
        completed_dates = current_user.practice_sessions
                                      .status_completed
                                      .where("completed_at >= ?", 7.days.ago.beginning_of_day)
                                      .pluck(Arel.sql("DATE(completed_at)"))
                                      .map(&:to_date)
                                      .uniq

        (0..6).map do |offset|
          date = (Date.current - (6 - offset))
          {
            date:      date.iso8601,
            day_label: date.strftime("%a")[0],
            completed: completed_dates.include?(date),
            is_today:  date == Date.current
          }
        end
      end

      def daily_streak
        days = current_user.practice_sessions
                           .status_completed
                           .where("completed_at >= ?", 60.days.ago)
                           .pluck(Arel.sql("DATE(completed_at)"))
                           .map(&:to_date)
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

      def best_streak
        days = current_user.practice_sessions
                           .status_completed
                           .pluck(Arel.sql("DATE(completed_at)"))
                           .map(&:to_date)
                           .uniq
                           .sort

        return 0 if days.empty?

        best = current = 1
        days.each_with_index do |d, i|
          next if i.zero?

          if d == days[i - 1] + 1.day
            current += 1
            best = current if current > best
          else
            current = 1
          end
        end
        best
      end

      def recommended_session
        weak_count = current_user.local_srs_states
                                 .where(practice_kind: "item")
                                 .where("stage <= ?", 4)
                                 .where("(correct_count + incorrect_count) >= 3 AND incorrect_count >= correct_count")
                                 .count

        if weak_count >= 5
          {
            mode:   "weakest_first",
            label:  "Drill #{weak_count} weak items",
            reason: "You've been getting these wrong consistently. A focused 5-minute session should help.",
            cta:    "Start session →"
          }
        elsif sentence_eligible_count >= 10
          {
            mode:   "sentence",
            label:  "Try sentence practice",
            reason: "You have #{sentence_eligible_count} Guru+ items ready for sentence drills.",
            cta:    "Start sentences →"
          }
        else
          {
            mode:   "random",
            label:  "Mixed practice",
            reason: "Drill across all your levels to keep things sharp.",
            cta:    "Start drilling →"
          }
        end
      end
    end
  end
end
