module Wanikani
  class Client
    BASE_URL = "https://api.wanikani.com".freeze
    API_PREFIX = "/v2".freeze
    REVISION = "20170710".freeze

    class Error < StandardError; end
    class InvalidTokenError < Error; end
    class RateLimitedError < Error; end
    class ServiceUnavailableError < Error; end

    def initialize(api_token:)
      @api_token = api_token
      raise ArgumentError, "api_token required" if @api_token.blank?
    end

    def user
      get("#{API_PREFIX}/user")
    end

    def subjects(updated_after: nil, types: nil)
      params = {}
      params[:updated_after] = updated_after.iso8601 if updated_after
      params[:types] = Array(types).join(",") if types
      paginate("#{API_PREFIX}/subjects", params)
    end

    def assignments(updated_after: nil)
      params = {}
      params[:updated_after] = updated_after.iso8601 if updated_after
      paginate("#{API_PREFIX}/assignments", params)
    end

    def study_materials(updated_after: nil)
      params = {}
      params[:updated_after] = updated_after.iso8601 if updated_after
      paginate("#{API_PREFIX}/study_materials", params)
    end

    private

    def connection
      @connection ||= Faraday.new(url: BASE_URL) do |f|
        f.request :retry,
                  max: 3,
                  interval: 0.5,
                  backoff_factor: 2,
                  retry_statuses: [429, 503]
        f.request :json
        f.response :json, content_type: /\bjson$/
        f.headers["Authorization"] = "Bearer #{@api_token}"
        f.headers["Wanikani-Revision"] = REVISION
        f.headers["Accept"] = "application/json"
        f.adapter Faraday.default_adapter
      end
    end

    def get(path, params = {})
      response = connection.get(path, params)
      handle_response(response)
    end

    def paginate(path, params = {})
      results = []
      url = path
      query = params

      loop do
        response = connection.get(url, query)
        body = handle_response(response)
        results.concat(body["data"]) if body["data"]

        next_url = body.is_a?(Hash) ? body.dig("pages", "next_url") : nil
        break unless next_url

        url = next_url.sub(BASE_URL, "")
        query = {}
      end

      results
    end

    def handle_response(response)
      case response.status
      when 200..299
        response.body
      when 401
        raise InvalidTokenError, "WaniKani API token is invalid or revoked"
      when 429
        raise RateLimitedError, "Rate limited by WaniKani API"
      when 500..599
        raise ServiceUnavailableError, "WaniKani API is unavailable (#{response.status})"
      else
        body_preview = response.body.is_a?(String) ? response.body[0..200] : response.body.inspect
        raise Error, "Unexpected response: #{response.status} — #{body_preview}"
      end
    end
  end
end