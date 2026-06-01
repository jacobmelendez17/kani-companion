module Api
  module V1
    class ChangelogEntriesController < BaseController
      skip_before_action :authenticate_user!

      def index
        entries = ChangelogEntry.published
        render json: { entries: entries.map { |e| serialize(e) } }
      end

      private

      def serialize(entry)
        {
          id:           entry.id,
          version:      entry.version,
          release_date: entry.release_date.iso8601,
          changes:      entry.changes,
          position:     entry.position,
        }
      end
    end
  end
end
