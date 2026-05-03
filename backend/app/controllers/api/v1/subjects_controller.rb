module Api
  module V1
    class SubjectsController < BaseController
      def index
        scope = Subject.all
        scope = scope.by_levels(params[:levels]) if params[:levels].present?
        scope = scope.of_types(params[:types]) if params[:types].present?

        # Only show subjects the user actually has assignments for
        scope = scope.joins(:assignments).where(assignments: { user_id: current_user.id })

        render json: scope.distinct.limit(500).as_json(only: %i[
          id wanikani_id subject_type level characters slug
        ])
      end
    end
  end
end
