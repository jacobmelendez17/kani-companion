class AddAdminAndPhrasePosition < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :admin, :boolean, default: false, null: false
    add_index :users, :admin

    # Phrases can be ordered per-subject. Lower position = shown first.
    # NULL means "unordered" — those fall back to random sort.
    add_column :phrase_subjects, :position, :integer
    add_index :phrase_subjects, %i[subject_id position]
  end
end
