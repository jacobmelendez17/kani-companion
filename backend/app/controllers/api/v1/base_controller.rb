module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate_user!

      rescue_from ActiveRecord::RecordNotFound, with: :not_found
      rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity

      private

      def authenticate_user!
        return if current_user

        render json: { error: "Unauthorized" }, status: :unauthorized
      end

      def current_user
        return @current_user if defined?(@current_user)

        token = request.headers["Authorization"]&.sub(/^Bearer /, "")
        return @current_user = nil if token.blank?

        session = Session.find_by(token: token)
        @current_user = session&.user
      end

      def not_found(error)
        render json: { error: error.message }, status: :not_found
      end

      def unprocessable_entity(error)
        render json: { errors: error.record.errors.full_messages }, status: :unprocessable_entity
      end
    end
  end
end