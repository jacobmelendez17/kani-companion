# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_01_01_000010) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "assignments", force: :cascade do |t|
    t.bigint "wanikani_id", null: false
    t.bigint "user_id", null: false
    t.bigint "subject_id", null: false
    t.integer "srs_stage", default: 0
    t.datetime "unlocked_at"
    t.datetime "started_at"
    t.datetime "passed_at"
    t.datetime "burned_at"
    t.datetime "available_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["passed_at"], name: "index_assignments_on_passed_at"
    t.index ["subject_id"], name: "index_assignments_on_subject_id"
    t.index ["user_id", "srs_stage"], name: "index_assignments_on_user_id_and_srs_stage"
    t.index ["user_id", "subject_id"], name: "index_assignments_on_user_id_and_subject_id", unique: true
    t.index ["user_id"], name: "index_assignments_on_user_id"
    t.index ["wanikani_id"], name: "index_assignments_on_wanikani_id", unique: true
  end

  create_table "local_srs_states", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "subject_id", null: false
    t.string "practice_kind", null: false
    t.integer "stage", default: 1, null: false
    t.integer "correct_count", default: 0
    t.integer "incorrect_count", default: 0
    t.integer "current_streak", default: 0
    t.datetime "last_reviewed_at"
    t.datetime "next_review_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["subject_id"], name: "index_local_srs_states_on_subject_id"
    t.index ["user_id", "next_review_at"], name: "index_local_srs_states_on_user_id_and_next_review_at"
    t.index ["user_id", "stage"], name: "index_local_srs_states_on_user_id_and_stage"
    t.index ["user_id", "subject_id", "practice_kind"], name: "index_local_srs_unique", unique: true
    t.index ["user_id"], name: "index_local_srs_states_on_user_id"
  end

  create_table "practice_answers", force: :cascade do |t|
    t.bigint "practice_session_id", null: false
    t.bigint "subject_id", null: false
    t.string "question_type"
    t.string "user_answer"
    t.boolean "correct", default: false
    t.datetime "answered_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["answered_at"], name: "index_practice_answers_on_answered_at"
    t.index ["practice_session_id"], name: "index_practice_answers_on_practice_session_id"
    t.index ["subject_id"], name: "index_practice_answers_on_subject_id"
  end

  create_table "practice_sessions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "session_type", null: false
    t.string "practice_mode"
    t.jsonb "level_range", default: []
    t.jsonb "item_types", default: []
    t.integer "total_questions", default: 0
    t.integer "correct_count", default: 0
    t.integer "incorrect_count", default: 0
    t.string "status", default: "in_progress"
    t.datetime "started_at"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["started_at"], name: "index_practice_sessions_on_started_at"
    t.index ["user_id", "status"], name: "index_practice_sessions_on_user_id_and_status"
    t.index ["user_id"], name: "index_practice_sessions_on_user_id"
  end

  create_table "practice_settings", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.integer "default_question_count", default: 20
    t.integer "default_level_min", default: 1
    t.integer "default_level_max", default: 60
    t.string "default_item_type", default: "kanji"
    t.string "default_practice_mode", default: "kanji_to_meaning"
    t.boolean "show_furigana", default: false
    t.boolean "autoplay_audio", default: false
    t.boolean "keyboard_shortcuts", default: true
    t.string "theme", default: "light"
    t.integer "daily_practice_goal", default: 50
    t.string "review_order", default: "random"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_practice_settings_on_user_id", unique: true
  end

  create_table "sessions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "token", null: false
    t.string "user_agent"
    t.string "ip_address"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["token"], name: "index_sessions_on_token", unique: true
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "study_materials", force: :cascade do |t|
    t.bigint "wanikani_id", null: false
    t.bigint "user_id", null: false
    t.bigint "subject_id", null: false
    t.text "meaning_note"
    t.text "reading_note"
    t.jsonb "meaning_synonyms", default: []
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["subject_id"], name: "index_study_materials_on_subject_id"
    t.index ["user_id", "subject_id"], name: "index_study_materials_on_user_id_and_subject_id", unique: true
    t.index ["user_id"], name: "index_study_materials_on_user_id"
    t.index ["wanikani_id"], name: "index_study_materials_on_wanikani_id", unique: true
  end

  create_table "subjects", force: :cascade do |t|
    t.bigint "wanikani_id", null: false
    t.string "subject_type", null: false
    t.integer "level", null: false
    t.string "characters"
    t.string "slug"
    t.jsonb "meanings", default: []
    t.jsonb "readings", default: []
    t.jsonb "parts_of_speech", default: []
    t.jsonb "context_sentences", default: []
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["level", "subject_type"], name: "index_subjects_on_level_and_subject_type"
    t.index ["level"], name: "index_subjects_on_level"
    t.index ["subject_type"], name: "index_subjects_on_subject_type"
    t.index ["wanikani_id"], name: "index_subjects_on_wanikani_id", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.string "email", null: false
    t.string "username", null: false
    t.string "password_digest", null: false
    t.string "session_token"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "lower((email)::text)", name: "index_users_on_lower_email", unique: true
    t.index "lower((username)::text)", name: "index_users_on_lower_username", unique: true
  end

  create_table "wanikani_profiles", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.text "api_token", null: false
    t.string "wanikani_username"
    t.integer "wanikani_level"
    t.string "sync_status", default: "pending", null: false
    t.datetime "last_synced_at"
    t.string "last_sync_error"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["sync_status"], name: "index_wanikani_profiles_on_sync_status"
    t.index ["user_id"], name: "index_wanikani_profiles_on_user_id", unique: true
  end

  add_foreign_key "assignments", "subjects"
  add_foreign_key "assignments", "users"
  add_foreign_key "local_srs_states", "subjects"
  add_foreign_key "local_srs_states", "users"
  add_foreign_key "practice_answers", "practice_sessions"
  add_foreign_key "practice_answers", "subjects"
  add_foreign_key "practice_sessions", "users"
  add_foreign_key "practice_settings", "users"
  add_foreign_key "sessions", "users"
  add_foreign_key "study_materials", "subjects"
  add_foreign_key "study_materials", "users"
  add_foreign_key "wanikani_profiles", "users"
end
