class WanikaniReviewSubmissionJob < ApplicationJob
  queue_as :default

  retry_on Wanikani::Client::RateLimitedError, wait: 30.seconds, attempts: 3
  retry_on Wanikani::Client::ServiceUnavailableError, wait: 1.minute, attempts: 3

  # Aggregates a completed practice session's answers per-subject and submits
  # them to WaniKani.
  #
  # Logic:
  #   - Group all PracticeAnswers by subject_id
  #   - For each subject, count incorrect meaning + reading answers
  #   - Only submit if the user answered BOTH meaning AND reading for that subject
  #     (WK requires both for kanji/vocab; submitting incomplete data would be wrong)
  #   - Only submit if the assignment is currently due
  #     (WK rejects with 422 otherwise)
  #   - Tolerate per-item failures so one bad item doesn't kill the whole batch
  def perform(practice_session_id)
    session = PracticeSession.find(practice_session_id)
    return unless session.sync_to_wanikani?
    return unless session.completed?

    user = session.user
    profile = user.wanikani_profile
    return mark_failed(session, "User has no WaniKani profile") unless profile

    client = Wanikani::Client.new(api_token: profile.api_token)

    # Group answers by subject. Each group has all meaning + reading attempts
    # for that subject within this session.
    grouped = session.practice_answers.includes(:subject).group_by(&:subject_id)

    submitted = 0
    skipped   = 0
    failed    = []

    grouped.each do |subject_id, answers|
      subject = answers.first.subject
      assignment = user.assignments.find_by(subject_id: subject_id)

      # Skip: user doesn't have an assignment for this subject (shouldn't happen,
      # but defensive)
      unless assignment
        skipped += 1
        next
      end

      # Skip: assignment isn't currently due in WK. Submitting would 422.
      unless assignment.available_at && assignment.available_at <= Time.current
        skipped += 1
        next
      end

      meaning_answers = answers.select { |a| a.question_type == "meaning" }
      reading_answers = answers.select { |a| a.question_type == "reading" }

      # For radicals: only meaning is required
      # For kanji/vocab: both meaning AND reading are required
      if subject.subject_type == "radical"
        next skipped += 1 if meaning_answers.empty?
      else
        # Skip if we don't have BOTH types of answers for this subject
        if meaning_answers.empty? || reading_answers.empty?
          skipped += 1
          next
        end
      end

      incorrect_meaning = meaning_answers.count { |a| !a.correct }
      incorrect_reading = reading_answers.count { |a| !a.correct }

      begin
        client.submit_review(
          subject_id:        subject.wanikani_id,
          incorrect_meaning: incorrect_meaning,
          incorrect_reading: incorrect_reading
        )
        submitted += 1
      rescue Wanikani::Client::UnprocessableError => e
        # Item probably already reviewed in WK between session start + submit,
        # or assignment is no longer due. Not fatal — just log + skip.
        Rails.logger.warn(
          "[WanikaniReviewSubmissionJob] session=#{session.id} subject=#{subject.id} unprocessable: #{e.message}"
        )
        skipped += 1
      rescue StandardError => e
        failed << "Subject #{subject.id}: #{e.class}: #{e.message}"
      end
    end

    if failed.any? && submitted.zero?
      session.update!(
        wanikani_submission_status: "failed",
        wanikani_submission_error:  failed.join("; ").truncate(500)
      )
    elsif failed.any?
      session.update!(
        wanikani_submission_status: "partial",
        wanikani_submission_error:  failed.join("; ").truncate(500)
      )
    else
      session.update!(
        wanikani_submission_status: "submitted",
        wanikani_submission_error:  nil
      )
    end

    Rails.logger.info(
      "[WanikaniReviewSubmissionJob] session=#{session.id} submitted=#{submitted} " \
      "skipped=#{skipped} failed=#{failed.size}"
    )

    # Trigger a sync after submitting so the local DB reflects the new SRS stages
    # from WK. Run async so we don't block.
    WanikaniSyncJob.perform_later(user.id) if submitted > 0
  end

  private

  def mark_failed(session, message)
    session.update!(
      wanikani_submission_status: "failed",
      wanikani_submission_error:  message
    )
  end
end
