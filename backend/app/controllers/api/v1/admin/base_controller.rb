module Api
  module V1
    module Admin
      # Base controller for admin-only endpoints. Returns 403 if current_user
      # is not flagged as admin in the database.
      class BaseController < ::Api::V1::BaseController
        before_action :require_admin!

        private

        def require_admin!
          return if current_user&.admin?

          render json: { error: "Admin access required" }, status: :forbidden
        end
      end
    end
  end
end
