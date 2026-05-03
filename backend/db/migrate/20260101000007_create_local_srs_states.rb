class CreateLocalSrsStates < ActiveRecord::Migration[8.0]
  def change
    create_table :local_srs_states do |t|
      t.references :user, null: false, foreign_key: true
      t.references :subject, null: false, foreign_key: true
      t.string :practice_kind, null: false # "item" or "sentence"
      t.integer :stage, default: 1, null: false
      t.integer :correct_count, default: 0
      t.integer :incorrect_count, default: 0
      t.integer :current_streak, default: 0
      t.datetime :last_reviewed_at
      t.datetime :next_review_at

      t.timestamps
    end

    add_index :local_srs_states,
              %i[user_id subject_id practice_kind],
              unique: true,
              name: "index_local_srs_unique"
    add_index :local_srs_states, %i[user_id next_review_at]
    add_index :local_srs_states, %i[user_id stage]
  end
end
