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

      # PATCH /api/v1/wanikani_profile/replace_token
      # Body: { api_token }
      # Validates the new token (and that it's the SAME WK account, since switching
      # accounts mid-stream would corrupt local SRS state). Updates the token, clears
      # sync error, and queues a fresh sync.
      def replace_token
        profile = current_user.wanikani_profile
        return render json: { error: "Not connected" }, status: :not_found unless profile

        new_token = params[:api_token].to_s.strip
        result = Wanikani::TokenValidator.call(new_token)

        unless result.valid?
          return render json: { error: result.error_message }, status: :unprocessable_entity
        end

        # Optional safety: warn if it's a different WK account.
        # We allow it but flag it so the frontend can prompt for confirmation.
        switching_accounts = profile.wanikani_username.present? &&
                             result.username.present? &&
                             profile.wanikani_username != result.username

        if switching_accounts && params[:confirm_account_switch] != "true"
          return render json: {
            error: "This token is for a different WaniKani account (#{result.username}). " \
                   "Switching accounts will invalidate your local practice progress. " \
                   "Resend with confirm_account_switch=true to proceed.",
            kind: "account_mismatch",
            current_username: profile.wanikani_username,
            new_username:     result.username
          }, status: :conflict
        end

        # If switching accounts, blow away the SRS state so it doesn't get mixed up
        if switching_accounts
          current_user.local_srs_states.destroy_all
          current_user.assignments.destroy_all
          current_user.study_materials.destroy_all
        end

        profile.update!(
          api_token:         new_token,
          wanikani_username: result.username,
          wanikani_level:    result.level,
          sync_status:       "pending",
          last_sync_error:   nil
        )

        WanikaniSyncJob.perform_later(current_user.id)

        render json: { ok: true, sync_status: "pending", switched_accounts: switching_accounts }
      end

      # DELETE /api/v1/wanikani_profile
      # Disconnects WK from the user. By default keeps assignments/study_materials/SRS.
      # Pass `purge=true` to wipe them too (use when user wants a clean slate).
      def destroy
        if params[:purge] == "true"
          current_user.local_srs_states.destroy_all
          current_user.assignments.destroy_all
          current_user.study_materials.destroy_all
        end

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
