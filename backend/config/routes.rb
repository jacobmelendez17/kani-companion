Rails.application.routes.draw do
  # Health check for Fly.io
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      # Auth
      post   "auth/signup", to: "auth#signup"
      post   "auth/login",  to: "auth#login"
      delete "auth/logout", to: "auth#logout"
      get    "auth/username_available", to: "auth#username_available"
      get    "auth/email_available",    to: "auth#email_available"

      # WaniKani profile
      resource :wanikani_profile, only: %i[show create destroy] do
        post :resync
      end

      # Practice
      resources :practice_sessions, only: %i[index create show] do
        post :answer, on: :member
        post :complete, on: :member
      end

      # Subjects (for setup pages)
      resources :subjects, only: %i[index]

      # Settings
      resource :practice_setting, only: %i[show update]

      # Dashboard
      get "dashboard", to: "dashboard#show"
    end
  end
end
