class AddSentencePracticeSettings < ActiveRecord::Migration[8.0]
  def change
    change_table :practice_settings do |t|
      t.string  :breakdown_panel_mode, default: "on_incorrect"
      t.boolean :furigana_default_visible, default: true
      t.string  :sentence_default_scope, default: "current_level" # current_level | all_eligible | custom
      t.string  :sentence_default_stage_filter, default: "all" # all | apprentice_only | guru_plus
      t.string  :sentence_default_mix, default: "mix" # new_only | review_only | mix
    end
  end
end
