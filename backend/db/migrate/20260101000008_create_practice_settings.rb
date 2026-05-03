class CreatePracticeSettings < ActiveRecord::Migration[8.0]
  def change
    create_table :practice_settings do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.integer :default_question_count, default: 20
      t.integer :default_level_min, default: 1
      t.integer :default_level_max, default: 60
      t.string :default_item_type, default: "kanji"
      t.string :default_practice_mode, default: "kanji_to_meaning"
      t.boolean :show_furigana, default: false
      t.boolean :autoplay_audio, default: false
      t.boolean :keyboard_shortcuts, default: true
      t.string :theme, default: "light"
      t.integer :daily_practice_goal, default: 50
      t.string :review_order, default: "random"

      t.timestamps
    end
  end
end
