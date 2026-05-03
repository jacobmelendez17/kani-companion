module Api
  module V1
    class PracticeSettingsController < BaseController
      def show
        render json: settings_payload(current_user.practice_settings.first || create_default)
      end

      def update
        settings = current_user.practice_settings.first || create_default
        if settings.update(setting_params)
          render json: settings_payload(settings)
        else
          render json: { errors: settings.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def setting_params
        params.permit(
          :default_question_count, :default_level_min, :default_level_max,
          :default_item_type, :default_practice_mode, :show_furigana,
          :autoplay_audio, :keyboard_shortcuts, :theme, :daily_practice_goal,
          :review_order
        )
      end

      def create_default
        PracticeSetting.create_defaults_for(current_user)
      end

      def settings_payload(s)
        s.as_json(except: %i[user_id created_at updated_at])
      end
    end
  end
end
