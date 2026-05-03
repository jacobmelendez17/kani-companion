class CreatePracticeSessions < ActiveRecord::Migration[8.0]
  def change
    create_table :practice_sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :session_type, null: false # "item" or "sentence"
      t.string :practice_mode # kanji_to_meaning, etc.
      t.jsonb :level_range, default: []
      t.jsonb :item_types, default: []
      t.integer :total_questions, default: 0
      t.integer :correct_count, default: 0
      t.integer :incorrect_count, default: 0
      t.string :status, default: "in_progress" # in_progress, completed, abandoned
      t.datetime :started_at
      t.datetime :completed_at

      t.timestamps
    end

    add_index :practice_sessions, %i[user_id status]
    add_index :practice_sessions, :started_at
  end
end
