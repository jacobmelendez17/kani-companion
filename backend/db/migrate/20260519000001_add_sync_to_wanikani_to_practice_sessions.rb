class AddSyncToWanikaniToPracticeSessions < ActiveRecord::Migration[8.0]
  def change
    # When true, the session's results get submitted to WaniKani's real review
    # API at completion time, advancing the user's actual WK SRS stages.
    # Default false — practice mode is the default; WK sync is opt-in.
    add_column :practice_sessions, :sync_to_wanikani, :boolean,
               default: false, null: false

    # Submission outcome:
    #   "not_attempted" — toggle was off, or session abandoned
    #   "submitted"     — all reviews POSTed successfully
    #   "partial"       — some reviews succeeded, some failed
    #   "failed"        — submission errored before completing
    add_column :practice_sessions, :wanikani_submission_status, :string,
               default: "not_attempted", null: false

    # Stores the error message if submission failed/partially failed.
    add_column :practice_sessions, :wanikani_submission_error, :text

    add_index :practice_sessions, :sync_to_wanikani
  end
end
