module Api
  module V1
    class AuthController < ApplicationController
      # `me` requires authentication
      before_action :authenticate_user!, only: [:me]

      def signup
        user = User.new(signup_params)
        if user.save
          session = user.sessions.create!
          render json: { user: user_payload(user), token: session.token }, status: :created
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def login
        user = User.find_by("LOWER(email) = ?", params[:email].to_s.downcase)
        if user&.authenticate(params[:password])
          session = user.sessions.create!
          render json: { user: user_payload(user), token: session.token }
        else
          render json: { error: "Invalid email or password" }, status: :unauthorized
        end
      end

      def logout
        token = request.headers["Authorization"]&.sub(/^Bearer /, "")
        Session.find_by(token: token)&.destroy if token.present?
        head :no_content
      end

      def me
        render json: { user: user_payload(current_user) }
      end

      def username_available
        username = params[:username].to_s.strip
        return render json: { available: false, reason: "blank" } if username.empty?

        unless username.match?(/\A[a-zA-Z0-9_]{3,30}\z/)
          return render json: { available: false, reason: "invalid" }
        end

        taken = User.where("LOWER(username) = ?", username.downcase).exists?
        render json: { available: !taken }
      end

      def email_available
        email = params[:email].to_s.strip.downcase
        return render json: { available: false, reason: "blank" } if email.empty?

        unless email.match?(URI::MailTo::EMAIL_REGEXP)
          return render json: { available: false, reason: "invalid" }
        end

        taken = User.where("LOWER(email) = ?", email).exists?
        render json: { available: !taken }
      end

      private

      def signup_params
        params.permit(:email, :username, :password, :password_confirmation)
      end

      def user_payload(user)
        {
          id:       user.id,
          email:    user.email,
          username: user.username,
          admin:    user.admin
        }
      end

      def authenticate_user!
        token = request.headers["Authorization"]&.sub(/^Bearer /, "")
        @current_user = Session.find_by(token: token)&.user if token.present?
        head :unauthorized unless @current_user
      end

      def current_user
        @current_user
      end
    end
  end
end
