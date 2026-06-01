module Api
  module V1
    module Demo
      class SubjectsController < ApplicationController
        DEMO_LEVELS = (1..3).freeze

        def index
          subjects = Subject.where(level: DEMO_LEVELS)
                            .order(:level, :subject_type, :wanikani_id)

          grouped = subjects.group_by(&:level).transform_values do |ss|
            ss.map { |s| serialize(s) }
          end

          render json: { levels: grouped }
        end

        private

        def serialize(s)
          {
            id:           s.id,
            characters:   s.characters,
            subject_type: s.subject_type,
            level:        s.level,
            meaning:      s.primary_meaning,
            reading:      s.primary_reading,
            slug:         s.slug,
          }
        end
      end
    end
  end
end
