module Api
  module V1
    class WanikaniProfilesController < BaseController
      def show
        profile = current_user.wanikani_profile
        return render json: { connected: false } unless profile

        render json: {
          connected:        true,
          masked_token:     profile.mask_token,
          username:         profile.wanikani_username,
          level:            profile.wanikani_level,
          sync_status:      profile.sync_status,
          last_synced_at:   profile.last_synced_at,
          last_sync_error:  profile.last_sync_error
        }
      end

      def create
        token = params[:api_token].to_s.strip
        result = Wanikani::TokenValidator.call(token)

        unless result.valid?
          return render json: { error: result.error_message }, status: :unprocessable_entity
        end

        profile = current_user.wanikani_profile || current_user.build_wanikani_profile
        profile.assign_attributes(
          api_token:         token,
          wanikani_username: result.username,
          wanikani_level:    result.level,
          sync_status:       "pending"
        )
        profile.save!

        WanikaniSyncJob.perform_later(current_user.id)

        render json: { ok: true, sync_status: "pending" }, status: :created
      end

      def destroy
        current_user.wanikani_profile&.destroy
        head :no_content
      end

      def resync
        profile = current_user.wanikani_profile
        return render json: { error: "No WaniKani profile connected" }, status: :not_found unless profile
        return render json: { error: "Sync already in progress" }, status: :conflict if profile.sync_status_syncing?

        profile.update!(sync_status: "pending")
        WanikaniSyncJob.perform_later(current_user.id)
        render json: { ok: true, sync_status: "pending" }
      end
    end
  end
end
