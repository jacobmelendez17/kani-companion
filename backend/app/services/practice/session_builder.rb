module Practice
  # Builds a practice session: filters subjects by levels/types and the user's
  # WaniKani assignments, then picks N items based on review order.
  class SessionBuilder
    def initialize(user:, session_type:, level_min:, level_max:, item_types:, count:, review_order: "random")
      @user = user
      @session_type = session_type
      @level_min = level_min
      @level_max = level_max
      @item_types = Array(item_types)
      @count = count.to_i
      @review_order = review_order
    end

    def call
      eligible_assignments = filter_assignments
      ordered = order_assignments(eligible_assignments)
      ordered.limit(@count).map(&:subject)
    end

    private

    def filter_assignments
      scope = @user.assignments
                   .joins(:subject)
                   .where(subjects: { level: @level_min..@level_max })

      scope = scope.where(subjects: { subject_type: @item_types }) if @item_types.any?

      # Item practice = anything unlocked.
      # Sentence practice = guru and above only (per spec).
      if @session_type == "sentence"
        scope = scope.where("assignments.srs_stage >= ? OR assignments.passed_at IS NOT NULL", 5)
      else
        scope = scope.where("assignments.srs_stage > 0")
      end

      scope
    end

    def order_assignments(scope)
      case @review_order
      when "weakest_first"
        # Lowest local SRS stage first; fall back to WK srs_stage
        scope.left_joins(subject: :local_srs_states)
             .where("local_srs_states.user_id = ? OR local_srs_states.user_id IS NULL", @user.id)
             .order("COALESCE(local_srs_states.stage, 1) ASC, assignments.srs_stage ASC")
      when "newest_first"
        scope.order("assignments.unlocked_at DESC NULLS LAST")
      when "oldest_first"
        scope.order("assignments.unlocked_at ASC NULLS LAST")
      else
        scope.order(Arel.sql("RANDOM()"))
      end
    end
  end
end
