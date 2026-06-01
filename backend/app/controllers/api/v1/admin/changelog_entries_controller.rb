module Api
  module V1
    module Admin
      class ChangelogEntriesController < BaseController
        before_action :set_entry, only: %i[update destroy]

        # GET /api/v1/admin/changelog_entries
        # Returns all entries (published + drafts), ordered by position then date.
        def index
          entries = ChangelogEntry.order(position: :asc, release_date: :desc)
          render json: { entries: entries.map { |e| serialize(e) } }
        end

        # POST /api/v1/admin/changelog_entries
        def create
          entry = ChangelogEntry.new(entry_params)
          entry.position = ChangelogEntry.maximum(:position).to_i + 1
          entry.save!
          render json: { entry: serialize(entry) }, status: :created
        end

        # PATCH /api/v1/admin/changelog_entries/:id
        def update
          @entry.update!(entry_params)
          render json: { entry: serialize(@entry) }
        end

        # DELETE /api/v1/admin/changelog_entries/:id
        def destroy
          @entry.destroy!
          head :no_content
        end

        private

        def set_entry
          @entry = ChangelogEntry.find(params[:id])
        end

        def entry_params
          params.require(:changelog_entry).permit(:version, :release_date, :published, :position, changes: [:type, :text])
        end

        def serialize(entry)
          {
            id:           entry.id,
            version:      entry.version,
            release_date: entry.release_date.iso8601,
            changes:      entry.changes,
            published:    entry.published,
            position:     entry.position,
          }
        end
      end
    end
  end
end
