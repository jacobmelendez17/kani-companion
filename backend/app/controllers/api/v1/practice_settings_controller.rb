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

      # POST /api/v1/practice_setting/reset
      # Wipes all settings back to defaults.
      def reset
        current_user.practice_settings.destroy_all
        render json: settings_payload(create_default)
      end

      private

      def setting_params
        params.permit(
          # Item practice
          :default_question_count, :default_level_min, :default_level_max,
          :default_item_type, :default_practice_mode, :review_order,
          # Sentence practice
          :sentence_default_scope, :sentence_default_stage_filter, :sentence_default_mix,
          :breakdown_panel_mode, :furigana_default_visible,
          # Preferences
          :show_furigana, :autoplay_audio, :keyboard_shortcuts, :theme, :daily_practice_goal
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
