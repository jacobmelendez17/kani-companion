class AddJapaneseFontToPracticeSettings < ActiveRecord::Migration[8.0]
  def change
    # Which Japanese font to use when rendering kanji/kana during practice.
    # Defaults to the existing app default. Users can change in Settings →
    # Sentence Practice.
    add_column :practice_settings, :japanese_font, :string,
               default: "zen_maru_gothic", null: false
  end
end
