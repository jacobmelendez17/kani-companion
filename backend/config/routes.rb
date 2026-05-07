Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      post   "auth/signup", to: "auth#signup"
      post   "auth/login",  to: "auth#login"
      delete "auth/logout", to: "auth#logout"
      get    "auth/username_available", to: "auth#username_available"
      get    "auth/email_available",    to: "auth#email_available"
      get    "me",          to: "auth#me"

      # Account management
      get    "account",          to: "account#show"
      patch  "account",          to: "account#update"
      patch  "account/password", to: "account#update_password"
      delete "account",          to: "account#destroy"

      resource :wanikani_profile, only: %i[show create destroy] do
        post  :resync
        patch :replace_token
      end

      resources :practice_sessions, only: %i[index create show] do
        post :answer,   on: :member
        post :complete, on: :member
        post :abandon,  on: :member
      end

      resources :subjects, only: %i[index]

      resource :practice_setting, only: %i[show update] do
        post :reset
      end

      get "sentence_practice/eligible_subjects", to: "sentence_practice#eligible_subjects"
      get "sentence_practice/eligibility",       to: "sentence_practice#eligibility"

      get "dashboard", to: "dashboard#show"

      namespace :admin do
        get  "phrases/search_subjects", to: "phrases#search_subjects"
        post "phrases/reorder",         to: "phrases#reorder"
        resources :phrases, only: %i[index create update destroy]
      end
    end
  end
end
