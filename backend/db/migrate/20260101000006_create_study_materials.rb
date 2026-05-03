class CreateStudyMaterials < ActiveRecord::Migration[8.0]
  def change
    create_table :study_materials do |t|
      t.bigint :wanikani_id, null: false
      t.references :user, null: false, foreign_key: true
      t.references :subject, null: false, foreign_key: true
      t.text :meaning_note
      t.text :reading_note
      t.jsonb :meaning_synonyms, default: []

      t.timestamps
    end

    add_index :study_materials, :wanikani_id, unique: true
    add_index :study_materials, %i[user_id subject_id], unique: true
  end
end
