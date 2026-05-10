class WanikaniSyncJob < ApplicationJob
  queue_as :default

  retry_on Wanikani::Client::RateLimitedError, wait: :polynomially_longer, attempts: 5
  retry_on Wanikani::Client::ServiceUnavailableError, wait: 30.seconds, attempts: 3

  discard_on Wanikani::Client::InvalidTokenError do |job, _error|
    profile = WanikaniProfile.find_by(user_id: job.arguments.first)
    profile&.update(sync_status: "failed", last_sync_error: "Invalid or revoked token")
  end

  def perform(user_id)
    user = User.find(user_id)
    profile = user.wanikani_profile
    return unless profile

    profile.update!(sync_status: "syncing", last_sync_error: nil)

    client = Wanikani::Client.new(api_token: profile.api_token)

    # Force a full sync if this user has no data yet, regardless of last_synced_at.
    # This handles the case where a previous sync claimed success but assignments
    # never actually populated. Without this, the job uses incremental sync forever
    # and the data gap is permanent.
    user_has_data = user.assignments.exists?
    updated_after = user_has_data ? profile.last_synced_at : nil

    # Each phase tracks its own success. We only bump last_synced_at at the very
    # end if ALL phases succeeded. If any phase raises, the rescue block below
    # marks the profile as failed and keeps the old last_synced_at so the next
    # sync attempt picks up where this one left off.
    sync_user_profile(profile, client)
    subjects_inserted = sync_subjects(client, updated_after)
    assignments_inserted = sync_assignments(user, client, updated_after)
    materials_inserted = sync_study_materials(user, client, updated_after)

    Rails.logger.info(
      "[WanikaniSyncJob] user=#{user_id} subjects=#{subjects_inserted} " \
      "assignments=#{assignments_inserted} study_materials=#{materials_inserted}"
    )

    profile.update!(sync_status: "completed", last_synced_at: Time.current)
  rescue StandardError => e
    Rails.logger.error(
      "[WanikaniSyncJob] Failed for user=#{user_id}: #{e.class}: #{e.message}\n" \
      "#{e.backtrace.first(5).join("\n")}"
    )
    profile&.update(sync_status: "failed", last_sync_error: "#{e.class}: #{e.message}".truncate(500))
    raise
  end

  private

  def sync_user_profile(profile, client)
    data = client.user.dig("data") || {}
    profile.update!(
      wanikani_username: data["username"],
      wanikani_level:    data["level"]
    )
  end

  def sync_subjects(client, updated_after)
    inserted = 0
    client.subjects(updated_after: updated_after).each do |subject|
      data = subject["data"] || {}
      Subject.upsert(
        {
          wanikani_id:       subject["id"],
          subject_type:      subject["object"],
          level:             data["level"],
          characters:        data["characters"],
          slug:              data["slug"],
          meanings:          data["meanings"],
          readings:          data["readings"],
          parts_of_speech:   data["parts_of_speech"],
          context_sentences: data["context_sentences"],
          updated_at:        Time.current
        },
        unique_by: :wanikani_id
      )
      inserted += 1
    end
    inserted
  end

  def sync_assignments(user, client, updated_after)
    inserted = 0
    skipped_no_subject = 0

    client.assignments(updated_after: updated_after).each do |assignment|
      data = assignment["data"] || {}
      subject = Subject.find_by(wanikani_id: data["subject_id"])
      if subject.nil?
        skipped_no_subject += 1
        next
      end

      Assignment.upsert(
        {
          wanikani_id:  assignment["id"],
          user_id:      user.id,
          subject_id:   subject.id,
          srs_stage:    data["srs_stage"],
          unlocked_at:  data["unlocked_at"],
          started_at:   data["started_at"],
          passed_at:    data["passed_at"],
          burned_at:    data["burned_at"],
          available_at: data["available_at"],
          updated_at:   Time.current
        },
        unique_by: :wanikani_id
      )
      inserted += 1
    end

    if skipped_no_subject > 0
      Rails.logger.warn(
        "[WanikaniSyncJob] user=#{user.id} skipped #{skipped_no_subject} assignments with unknown subjects. " \
        "Consider re-running subject sync."
      )
    end
    inserted
  end

  def sync_study_materials(user, client, updated_after)
    inserted = 0
    client.study_materials(updated_after: updated_after).each do |material|
      data = material["data"] || {}
      subject = Subject.find_by(wanikani_id: data["subject_id"])
      next unless subject

      StudyMaterial.upsert(
        {
          wanikani_id:      material["id"],
          user_id:          user.id,
          subject_id:       subject.id,
          meaning_note:     data["meaning_note"],
          reading_note:     data["reading_note"],
          meaning_synonyms: data["meaning_synonyms"],
          updated_at:       Time.current
        },
        unique_by: :wanikani_id
      )
      inserted += 1
    end
    inserted
  end
end