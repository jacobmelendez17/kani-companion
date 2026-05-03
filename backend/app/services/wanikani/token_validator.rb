module Wanikani
  # Validates a token by hitting /user and returning the username/level.
  # Used during onboarding before we kick off a full sync.
  class TokenValidator
    Result = Struct.new(:valid?, :username, :level, :error_message, keyword_init: true)

    def self.call(api_token)
      return Result.new(valid?: false, error_message: "Token cannot be blank") if api_token.blank?

      client = Client.new(api_token: api_token)
      response = client.user

      Result.new(
        valid?: true,
        username: response.dig("data", "username"),
        level: response.dig("data", "level")
      )
    rescue Client::InvalidTokenError
      Result.new(valid?: false, error_message: "Invalid or revoked WaniKani API token")
    rescue Client::ServiceUnavailableError
      Result.new(valid?: false, error_message: "WaniKani is currently unavailable. Try again shortly.")
    rescue Client::RateLimitedError
      Result.new(valid?: false, error_message: "Rate limited. Please wait a minute and retry.")
    rescue StandardError => e
      Rails.logger.error("[TokenValidator] #{e.class}: #{e.message}")
      Result.new(valid?: false, error_message: "Could not validate token. Please try again.")
    end
  end
end
