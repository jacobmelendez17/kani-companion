class CreateWanikaniProfiles < ActiveRecord::Migration[8.0]
  def change
    create_table :wanikani_profiles do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.text :api_token, null: false # encrypted via ActiveRecord::Encryption
      t.string :wanikani_username
      t.integer :wanikani_level
      t.string :sync_status, default: "pending", null: false
      t.datetime :last_synced_at
      t.string :last_sync_error

      t.timestamps
    end

    add_index :wanikani_profiles, :sync_status
  end
end
