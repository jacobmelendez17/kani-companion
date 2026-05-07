class PracticeSetting < ApplicationRecord
  belongs_to :user

  enum :review_order, {
    random:        "random",
    weakest_first: "weakest_first",
    newest_first:  "newest_first",
    oldest_first:  "oldest_first"
  }, prefix: true

  # Theme: light is the only fully-implemented theme. "system" follows OS preference
  # (currently renders as light since dark mode isn't implemented yet). "dark" is
  # accepted in the DB but the UI marks it as "coming soon" and disables the option.
  enum :theme, { light: "light", dark: "dark", system: "system" }, prefix: true

  enum :breakdown_panel_mode, {
    always:       "always",
    never:        "never",
    on_incorrect: "on_incorrect"
  }, prefix: true

  enum :sentence_default_scope, {
    current_level: "current_level",
    all_eligible:  "all_eligible",
    custom:        "custom"
  }, prefix: true

  enum :sentence_default_stage_filter, {
    all:             "all",
    apprentice_only: "apprentice_only",
    guru_plus:       "guru_plus"
  }, prefix: true

  enum :sentence_default_mix, {
    new_only:    "new_only",
    review_only: "review_only",
    mix:         "mix"
  }, prefix: true

  def self.create_defaults_for(user)
    create!(
      user: user,
      # Item practice
      default_question_count: 20,
      default_level_min:      1,
      default_level_max:      60,
      default_item_type:      "kanji",
      default_practice_mode:  "kanji_to_meaning",
      review_order:           "random",
      # Sentence practice
      sentence_default_scope:        "current_level",
      sentence_default_stage_filter: "all",
      sentence_default_mix:          "mix",
      breakdown_panel_mode:          "on_incorrect",
      furigana_default_visible:      true,
      # Preferences
      show_furigana:       false,
      autoplay_audio:      false,
      keyboard_shortcuts:  true,
      theme:               "light",
      daily_practice_goal: 50
    )
  end
end
