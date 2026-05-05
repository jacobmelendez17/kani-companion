class CreatePhrases < ActiveRecord::Migration[8.0]
  def change
    create_table :phrases do |t|
      t.text :japanese, null: false
      t.text :english,  null: false
      t.string :source, null: false # "tatoeba" | "wanikani" | "admin"
      t.string :source_id           # tatoeba sentence id, or wk subject_id+context_index
      t.integer :length, null: false # character count of japanese
      t.integer :length_bucket, null: false # 0=short(<10), 1=medium(10-25), 2=long(>25)
      t.integer :jlpt_level # 5=N5, 4=N4, ..., 1=N1, nil=unknown
      t.boolean :has_furigana, default: false # true for WK (provided), false for Tatoeba (must generate)
      t.text :furigana_data # JSON: array of [kanji, reading] pairs for WK sentences
      t.timestamps
    end

    add_index :phrases, :source
    add_index :phrases, :length_bucket
    add_index :phrases, %i[source source_id], unique: true

    create_table :phrase_subjects do |t|
      t.references :phrase,  null: false, foreign_key: true
      t.references :subject, null: false, foreign_key: true
      t.boolean :is_primary, default: false # true if this is the "target" subject for the phrase
      t.timestamps
    end

    add_index :phrase_subjects, %i[phrase_id subject_id], unique: true
    add_index :phrase_subjects, %i[subject_id is_primary]
  end
end
