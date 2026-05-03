class CreateAssignments < ActiveRecord::Migration[8.0]
  def change
    create_table :assignments do |t|
      t.bigint :wanikani_id, null: false
      t.references :user, null: false, foreign_key: true
      t.references :subject, null: false, foreign_key: true
      t.integer :srs_stage, default: 0
      t.datetime :unlocked_at
      t.datetime :started_at
      t.datetime :passed_at
      t.datetime :burned_at
      t.datetime :available_at

      t.timestamps
    end

    add_index :assignments, :wanikani_id, unique: true
    add_index :assignments, %i[user_id subject_id], unique: true
    add_index :assignments, %i[user_id srs_stage]
    add_index :assignments, :passed_at
  end
end
