class WanikaniProfile < ApplicationRecord
  belongs_to :user

  # Rails 7+ built-in encryption — never logged, never returned in JSON
  encrypts :api_token

  # filter_attributes adds extra protection against accidental logging
  self.filter_attributes += %i[api_token]

  enum :sync_status, {
    pending:   "pending",
    syncing:   "syncing",
    completed: "completed",
    failed:    "failed"
  }, prefix: true

  validates :api_token, presence: true

  def needs_sync?
    last_synced_at.nil? || last_synced_at < 1.hour.ago
  end

  def mask_token
    return nil if api_token.blank?

    "••••-••••-••••-••••-#{api_token.last(4)}"
  end

  # Override to_json/as_json defaults to never expose the token
  def as_json(options = {})
    super(options.merge(except: :api_token)).merge(masked_token: mask_token)
  end
end
