module Api
  module V1
    class AuthController < ApplicationController
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

      private

      def signup_params
        params.permit(:email, :username, :password, :password_confirmation)
      end

      def user_payload(user)
        {
          id:       user.id,
          email:    user.email,
          username: user.username
        }
      end
    end
  end
end
