class CreateSubjects < ActiveRecord::Migration[8.0]
  def change
    create_table :subjects do |t|
      t.bigint :wanikani_id, null: false
      t.string :subject_type, null: false # radical, kanji, vocabulary
      t.integer :level, null: false
      t.string :characters
      t.string :slug
      t.jsonb :meanings, default: []
      t.jsonb :readings, default: []
      t.jsonb :parts_of_speech, default: []
      t.jsonb :context_sentences, default: []

      t.timestamps
    end

    add_index :subjects, :wanikani_id, unique: true
    add_index :subjects, :subject_type
    add_index :subjects, :level
    add_index :subjects, %i[level subject_type]
  end
end
