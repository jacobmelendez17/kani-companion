class CreateChangelogEntries < ActiveRecord::Migration[8.0]
  def change
    create_table :changelog_entries do |t|
      t.string  :version,      null: false
      t.date    :release_date, null: false
      t.jsonb   :changes,      null: false, default: []
      t.boolean :published,    null: false, default: false
      t.integer :position,     null: false, default: 0

      t.timestamps
    end

    add_index :changelog_entries, :published
    add_index :changelog_entries, :position
  end
end
