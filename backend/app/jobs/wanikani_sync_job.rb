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
    updated_after = profile.last_synced_at

    sync_user_profile(profile, client)
    sync_subjects(client, updated_after)
    sync_assignments(user, client, updated_after)
    sync_study_materials(user, client, updated_after)

    profile.update!(sync_status: "completed", last_synced_at: Time.current)
  rescue StandardError => e
    Rails.logger.error("[WanikaniSyncJob] Failed for user #{user_id}: #{e.class}: #{e.message}")
    profile&.update(sync_status: "failed", last_sync_error: e.message.truncate(500))
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
    client.subjects(updated_after: updated_after).each do |subject|
      data = subject["data"] || {}
      Subject.upsert(
        {
          wanikani_id:  subject["id"],
          subject_type: subject["object"],
          level:        data["level"],
          characters:   data["characters"],
          slug:         data["slug"],
          meanings:     data["meanings"],
          readings:     data["readings"],
          parts_of_speech: data["parts_of_speech"],
          context_sentences: data["context_sentences"],
          updated_at:   Time.current
        },
        unique_by: :wanikani_id
      )
    end
  end

  def sync_assignments(user, client, updated_after)
    client.assignments(updated_after: updated_after).each do |assignment|
      data = assignment["data"] || {}
      subject = Subject.find_by(wanikani_id: data["subject_id"])
      next unless subject

      Assignment.upsert(
        {
          wanikani_id: assignment["id"],
          user_id:     user.id,
          subject_id:  subject.id,
          srs_stage:   data["srs_stage"],
          unlocked_at: data["unlocked_at"],
          started_at:  data["started_at"],
          passed_at:   data["passed_at"],
          burned_at:   data["burned_at"],
          available_at: data["available_at"],
          updated_at:  Time.current
        },
        unique_by: :wanikani_id
      )
    end
  end

  def sync_study_materials(user, client, updated_after)
    client.study_materials(updated_after: updated_after).each do |material|
      data = material["data"] || {}
      subject = Subject.find_by(wanikani_id: data["subject_id"])
      next unless subject

      StudyMaterial.upsert(
        {
          wanikani_id:       material["id"],
          user_id:           user.id,
          subject_id:        subject.id,
          meaning_note:      data["meaning_note"],
          reading_note:      data["reading_note"],
          meaning_synonyms:  data["meaning_synonyms"],
          updated_at:        Time.current
        },
        unique_by: :wanikani_id
      )
    end
  end
end
