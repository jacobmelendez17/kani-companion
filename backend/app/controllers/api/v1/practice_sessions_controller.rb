module Api
  module V1
    class PracticeSessionsController < BaseController
      def index
        sessions = current_user.practice_sessions
                               .order(started_at: :desc)
                               .limit(50)
        render json: sessions.as_json(only: %i[
          id session_type practice_mode total_questions correct_count
          incorrect_count status started_at completed_at
        ])
      end

      def create
        builder_args = {
          user:         current_user,
          session_type: params[:session_type],
          level_min:    params[:level_min] || 1,
          level_max:    params[:level_max] || 60,
          item_types:   params[:item_types] || [],
          count:        params[:count] || 20,
          review_order: params[:review_order] || "random"
        }

        subjects = Practice::SessionBuilder.new(**builder_args).call

        if subjects.empty?
          return render json: {
            error: "No items match your criteria. Try adjusting levels or syncing WaniKani.",
            kind:  "empty_selection"
          }, status: :unprocessable_entity
        end

        session = current_user.practice_sessions.create!(
          session_type:    params[:session_type],
          practice_mode:   params[:practice_mode],
          level_range:     [params[:level_min], params[:level_max]],
          item_types:      params[:item_types] || [],
          total_questions: subjects.size
        )

        render json: {
          session: session_payload(session),
          subjects: subjects.map { |s| subject_payload(s) }
        }, status: :created
      end

      def show
        session = current_user.practice_sessions.find(params[:id])
        render json: session_payload(session)
      end

      def answer
        session = current_user.practice_sessions.find(params[:id])
        subject = Subject.find(params[:subject_id])
        question_type = params[:question_type]
        user_answer = params[:answer].to_s

        correct = check_answer(subject, question_type, user_answer)

        PracticeAnswer.create!(
          practice_session: session,
          subject:          subject,
          question_type:    question_type,
          user_answer:      user_answer,
          correct:          correct
        )

        session.increment!(correct ? :correct_count : :incorrect_count)

        update_local_srs(subject, session.session_type, correct)

        render json: {
          correct: correct,
          expected: expected_answers(subject, question_type)
        }
      end

      def complete
        session = current_user.practice_sessions.find(params[:id])
        session.complete!
        render json: session_payload(session)
      end

      private

      def session_payload(session)
        session.as_json(only: %i[
          id session_type practice_mode total_questions correct_count
          incorrect_count status started_at completed_at
        ]).merge(accuracy: session.accuracy)
      end

      def subject_payload(subject)
        {
          id:          subject.id,
          wanikani_id: subject.wanikani_id,
          type:        subject.subject_type,
          level:       subject.level,
          characters:  subject.characters,
          slug:        subject.slug
          # Note: meanings/readings deliberately not sent to keep questions fair
        }
      end

      def check_answer(subject, question_type, answer)
        case question_type
        when "meaning"
          study_material = current_user.study_materials.find_by(subject_id: subject.id)
          Wanikani::AnswerNormalizer.match_meaning?(
            answer, subject: subject, study_material: study_material
          )
        when "reading"
          Wanikani::AnswerNormalizer.match_reading?(answer, subject: subject)
        else
          false
        end
      end

      def expected_answers(subject, question_type)
        case question_type
        when "meaning"
          subject.meanings&.map { |m| m["meaning"] } || []
        when "reading"
          subject.readings&.map { |r| r["reading"] } || []
        else
          []
        end
      end

      def update_local_srs(subject, kind, correct)
        srs = LocalSrsState.find_or_create_by!(
          user:          current_user,
          subject:       subject,
          practice_kind: kind
        ) do |s|
          s.stage = 1
        end

        correct ? srs.promote! : srs.demote!
      end
    end
  end
end
