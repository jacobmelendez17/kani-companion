class AddDemoToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :demo, :boolean, null: false, default: false
    add_column :users, :demo_expires_at, :datetime

    add_index :users, :demo
    add_index :users, :demo_expires_at
  end
end
