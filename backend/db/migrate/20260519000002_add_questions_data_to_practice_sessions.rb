class AddQuestionsDataToPracticeSessions < ActiveRecord::Migration[8.0]
  def change
    # Stores the full question list for the session as JSON.
    #
    # WHY: Previously the question list lived in Rails.cache (memory_store) with
    # a 4-hour TTL. Memory cache evicts entries under memory pressure (which
    # happens often on Fly's small VMs and across machine restarts). When the
    # cache was evicted, the next request rebuilt the questions in a freshly
    # shuffled order — which meant `questions[answered_count]` returned a
    # different subject than the frontend last displayed, causing the bug where
    # users would see one kanji on screen but be graded against a different one.
    #
    # Storing the question list on the session row makes it durable: it survives
    # cache eviction, machine restarts, and page refreshes. Reads are slightly
    # more expensive (one extra column on session fetch) but the consistency
    # win is worth it.
    add_column :practice_sessions, :questions_data, :jsonb, default: [], null: false
  end
end
