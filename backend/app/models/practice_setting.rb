class PracticeSetting < ApplicationRecord
  belongs_to :user

  enum :review_order, {
    random:       "random",
    weakest_first: "weakest_first",
    newest_first: "newest_first",
    oldest_first: "oldest_first"
  }, prefix: true

  enum :theme, { light: "light", dark: "dark" }, prefix: true

  def self.create_defaults_for(user)
    create!(
      user: user,
      default_question_count: 20,
      default_level_min: 1,
      default_level_max: 60,
      default_item_type: "kanji",
      default_practice_mode: "kanji_to_meaning",
      show_furigana: false,
      autoplay_audio: false,
      keyboard_shortcuts: true,
      theme: "light",
      daily_practice_goal: 50,
      review_order: "random"
    )
  end
end
