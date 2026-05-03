class CreatePracticeAnswers < ActiveRecord::Migration[8.0]
  def change
    create_table :practice_answers do |t|
      t.references :practice_session, null: false, foreign_key: true
      t.references :subject, null: false, foreign_key: true
      t.string :question_type # "meaning" or "reading"
      t.string :user_answer
      t.boolean :correct, default: false
      t.datetime :answered_at

      t.timestamps
    end

    add_index :practice_answers, :answered_at
  end
end
