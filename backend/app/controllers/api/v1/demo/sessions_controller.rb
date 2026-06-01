module Api
  module V1
    module Demo
      class SessionsController < ApplicationController
        DEMO_LEVELS = (1..3).freeze

        def create
          user = build_demo_user
          seed_assignments(user)
          token = Session.create!(user: user).token
          render json: { token: token, user: { id: user.id, username: user.username, demo: true, admin: false } },
                 status: :created
        end

        private

        def build_demo_user
          User.create!(
            username:        "demo_#{SecureRandom.hex(6)}",
            email:           "demo_#{SecureRandom.hex(8)}@demo.invalid",
            password:        SecureRandom.hex(16),
            demo:            true,
            demo_expires_at: 24.hours.from_now
          )
        end

        def seed_assignments(user)
          subjects = Subject.where(level: DEMO_LEVELS)
          now = Time.current

          rows = subjects.map do |s|
            {
              wanikani_id: synthetic_wanikani_id(user.id, s.id),
              user_id:     user.id,
              subject_id:  s.id,
              srs_stage:   5,
              unlocked_at: now,
              started_at:  now,
              passed_at:   now,
              available_at: now,
              created_at:  now,
              updated_at:  now,
            }
          end

          Assignment.insert_all!(rows) if rows.any?
        end

        # Generates a unique negative bigint per (user_id, subject_id) pair.
        # WaniKani IDs are always positive, so negatives are safe.
        def synthetic_wanikani_id(user_id, subject_id)
          -(user_id * 100_000 + subject_id)
        end
      end
    end
  end
end
