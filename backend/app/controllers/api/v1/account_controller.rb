module Api
  module V1
    class AccountController < BaseController
      # GET /api/v1/account
      # Returns the user's basic account info.
      def show
        render json: { account: account_payload }
      end

      # PATCH /api/v1/account
      # Updates username and/or email.
      # Body: { username?, email? }
      def update
        attrs = {}
        attrs[:username] = params[:username].to_s.strip if params[:username].present?
        attrs[:email]    = params[:email].to_s.strip.downcase if params[:email].present?

        if current_user.update(attrs)
          render json: { account: account_payload }
        else
          render json: { errors: current_user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/account/password
      # Body: { current_password, new_password, new_password_confirmation }
      def update_password
        unless current_user.authenticate(params[:current_password].to_s)
          return render json: { errors: ["Current password is incorrect"] }, status: :unprocessable_entity
        end

        new_password = params[:new_password].to_s
        confirmation = params[:new_password_confirmation].to_s

        if new_password.length < 8
          return render json: { errors: ["New password must be at least 8 characters"] }, status: :unprocessable_entity
        end

        if new_password != confirmation
          return render json: { errors: ["New password confirmation does not match"] }, status: :unprocessable_entity
        end

        if current_user.update(password: new_password, password_confirmation: confirmation)
          # Invalidate all other sessions so an attacker who knew the old password gets logged out
          current_token = request.headers["Authorization"]&.sub(/^Bearer /, "")
          current_user.sessions.where.not(token: current_token).destroy_all
          render json: { ok: true }
        else
          render json: { errors: current_user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/account
      # Body: { password }
      # Permanently deletes the account and all related data.
      def destroy
        unless current_user.authenticate(params[:password].to_s)
          return render json: { errors: ["Password is incorrect"] }, status: :unprocessable_entity
        end

        current_user.destroy!
        head :no_content
      end

      private

      def account_payload
        {
          id:       current_user.id,
          username: current_user.username,
          email:    current_user.email,
          admin:    current_user.admin,
          created_at: current_user.created_at
        }
      end
    end
  end
end
