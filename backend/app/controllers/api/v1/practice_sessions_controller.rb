module Api
  module V1
    class PracticeSessionsController < BaseController
      def index
        sessions = current_user.practice_sessions.order(started_at: :desc).limit(50)
        render json: sessions.map { |s| session_payload(s) }
      end

      def create
        session_type = params[:session_type] || "item"
        if session_type == "sentence"
          create_sentence_session
        else
          create_item_session
        end
      end

      def show
        session = current_user.practice_sessions.find(params[:id])
        questions = Rails.cache.read(session_questions_key(session.id)) || []
        answered  = session.practice_answers.count
        next_q    = questions[answered]

        render json: {
          session:       session_payload(session),
          next_question: next_q ? next_q.merge(index: answered, total: questions.size) : nil,
          setup_params:  stored_setup_params(session)
        }
      end

      def answer
        session = current_user.practice_sessions.find(params[:id])
        return render json: { error: "Session already completed" }, status: :unprocessable_entity if session.status_completed?

        questions = Rails.cache.read(session_questions_key(session.id)) || []
        index     = session.practice_answers.count
        question  = questions[index]
        return render json: { error: "No more questions" }, status: :unprocessable_entity unless question

        if session.session_type == "sentence"
          handle_sentence_answer(session, question, index)
        else
          handle_item_answer(session, question, index)
        end
      end

      def complete
        session = current_user.practice_sessions.find(params[:id])
        session.complete! unless session.status_completed?

        answers = session.practice_answers.includes(:subject)
        wrong   = answers.where(correct: false).map { |a| answer_summary_payload(a, session) }
        correct = answers.where(correct: true).count

        Rails.cache.delete(session_questions_key(session.id))

        summary = {
          total:            answers.count,
          correct:          correct,
          wrong:            answers.count - correct,
          accuracy:         session.accuracy,
          wrong_items:      wrong,
          duration_seconds: ((session.completed_at || Time.current) - session.started_at).to_i
        }
        summary[:srs_changes] = compute_srs_changes(session) if session.session_type == "sentence"

        render json: { session: session_payload(session), summary: summary, setup_params: stored_setup_params(session) }
      end

      def abandon
        session = current_user.practice_sessions.find(params[:id])
        unless session.status_completed?
          session.update!(status: "abandoned", completed_at: Time.current)
        end
        Rails.cache.delete(session_questions_key(session.id))
        head :no_content
      end

      private

      # =========================
      # ITEM SESSION
      # =========================
      def create_item_session
        item_types = parse_array(params[:item_types]).presence || %w[kanji vocabulary]
        levels     = parse_array(params[:levels]).map(&:to_i)
        count      = (params[:count] || 20).to_i.clamp(1, 500)
        mode       = params[:practice_mode].presence || "kanji_to_meaning"
        order      = params[:review_order].presence || "random"

        level_min, level_max = levels.any? ? [levels.min, levels.max] : [1, 60]

        builder_args = {
          user:         current_user,
          session_type: "item",
          level_min:    level_min,
          level_max:    level_max,
          item_types:   item_types,
          count:        count,
          review_order: order
        }
        subjects = ::Practice::SessionBuilder.new(**builder_args).call
        subjects = subjects.select { |s| levels.include?(s.level) } if levels.any?

        if subjects.empty?
          return render json: { error: "No items match.", kind: "empty_selection" }, status: :unprocessable_entity
        end

        session = current_user.practice_sessions.create!(
          session_type:    "item",
          practice_mode:   mode,
          level_range:     [level_min, level_max],
          item_types:      item_types,
          total_questions: subjects.size
        )

        questions = build_item_questions(subjects, mode)
        Rails.cache.write(session_questions_key(session.id), questions, expires_in: 4.hours)
        Rails.cache.write(session_setup_key(session.id), {
          item_types: item_types, levels: levels, count: count,
          practice_mode: mode, review_order: order, session_type: "item"
        }, expires_in: 24.hours)

        session.update!(total_questions: questions.size)

        render json: {
          session:        session_payload(session),
          first_question: questions.first&.merge(index: 0, total: questions.size),
          setup_params:   stored_setup_params(session)
        }, status: :created
      end

      def build_item_questions(subjects, mode)
        questions = []
        subjects.each do |subject|
          case mode
          when "kanji_to_reading"
            next if subject.subject_type_radical?
            questions << make_item_question(subject, "reading")
          when "mixed"
            questions << make_item_question(subject, "meaning")
            questions << make_item_question(subject, "reading") unless subject.subject_type_radical?
          else
            questions << make_item_question(subject, "meaning")
          end
        end
        questions.shuffle
      end

      def make_item_question(subject, question_type)
        {
          kind:          "item",
          subject_id:    subject.id,
          wanikani_id:   subject.wanikani_id,
          subject_type:  subject.subject_type,
          level:         subject.level,
          characters:    subject.characters,
          slug:          subject.slug,
          question_type: question_type,
          prompt:        subject.characters
        }
      end

      def handle_item_answer(session, question, _index)
        subject       = Subject.find(question[:subject_id] || question["subject_id"])
        question_type = question[:question_type] || question["question_type"]
        user_answer   = params[:answer].to_s

        correct = check_item_answer(subject, question_type, user_answer)
        record_and_respond(session, subject, question_type, user_answer, correct,
                           expected: expected_answers(subject, question_type),
                           subject_payload: subject_detail_payload(subject))
      end

      def check_item_answer(subject, question_type, answer)
        case question_type
        when "meaning"
          study_material = current_user.study_materials.find_by(subject_id: subject.id)
          ::Wanikani::AnswerNormalizer.match_meaning?(answer, subject: subject, study_material: study_material)
        when "reading"
          ::Wanikani::AnswerNormalizer.match_reading?(answer, subject: subject)
        else
          false
        end
      end

      # =========================
      # SENTENCE SESSION
      # =========================
      def create_sentence_session
        scope_type   = params[:scope_type].presence || "level"
        levels       = parse_array(params[:levels]).map(&:to_i)
        subject_ids  = parse_array(params[:subject_ids]).map(&:to_i)
        stage_filter = params[:stage_filter].presence || "all"
        mix_mode     = params[:mix_mode].presence || "mix"
        count        = (params[:count] || 20).to_i.clamp(1, 200)

        scope = { type: scope_type, levels: levels, subject_ids: subject_ids }

        questions = ::Practice::SentenceSessionBuilder.new(
          user: current_user, scope: scope, stage_filter: stage_filter,
          mix_mode: mix_mode, count: count
        ).call

        if questions.empty?
          return render json: {
            error: "No items + phrases match. You may need to sync WaniKani, run the Tatoeba import, or pick different filters.",
            kind:  "empty_selection"
          }, status: :unprocessable_entity
        end

        questions = questions.map { |q| q.merge(kind: "sentence") }

        session = current_user.practice_sessions.create!(
          session_type:    "sentence",
          practice_mode:   "ja_to_en",
          level_range:     levels.any? ? [levels.min, levels.max] : [1, 60],
          item_types:      %w[kanji vocabulary],
          total_questions: questions.size
        )

        Rails.cache.write(session_questions_key(session.id), questions, expires_in: 4.hours)
        Rails.cache.write(session_setup_key(session.id), {
          session_type: "sentence", scope_type: scope_type, levels: levels,
          subject_ids: subject_ids, stage_filter: stage_filter, mix_mode: mix_mode, count: count
        }, expires_in: 24.hours)

        render json: {
          session:        session_payload(session),
          first_question: questions.first&.merge(index: 0, total: questions.size),
          setup_params:   stored_setup_params(session)
        }, status: :created
      end

      def handle_sentence_answer(session, question, _index)
        subject_id     = question[:subject_id] || question["subject_id"]
        subject        = Subject.find(subject_id)
        english_target = question[:english_target] || question["english_target"]
        user_answer    = params[:answer].to_s
        targets        = [english_target].compact

        correct = ::Practice::SentenceAnswerNormalizer.match?(user_answer, targets: targets)
        srs_change = update_local_srs(subject, correct)

        record_and_respond(session, subject, "sentence_translate", user_answer, correct,
                           expected: { primary: english_target, accepted: targets },
                           subject_payload: subject_sentence_payload(subject, question),
                           extra: {
                             srs_change:      srs_change,
                             vocab_breakdown: build_breakdown_from_tokens(question, subject)
                           })
      end

      def update_local_srs(subject, correct)
        srs = LocalSrsState.find_or_create_by!(
          user: current_user, subject: subject, practice_kind: "sentence"
        ) { |s| s.stage = 1 }

        previous_stage = srs.stage_before_type_cast

        if correct
          srs.update!(correct_count: srs.correct_count + 1)
          srs.promote!
        else
          srs.update!(incorrect_count: srs.incorrect_count + 1)
          new_stage = [srs.stage_before_type_cast - 1, 1].max
          srs.update!(stage: new_stage, current_streak: 0, last_reviewed_at: Time.current)
        end

        srs.reload
        return nil if previous_stage == srs.stage_before_type_cast

        {
          previous:  stage_label(previous_stage),
          current:   stage_label(srs.stage_before_type_cast),
          direction: correct ? "promoted" : "demoted"
        }
      end

      def stage_label(stage)
        case stage
        when 1..4 then "APPRENTICE #{stage}"
        when 5..6 then "GURU #{stage - 4}"
        when 7    then "MASTER"
        when 8    then "ENLIGHTENED"
        when 9    then "BURNED"
        end
      end

      def subject_sentence_payload(subject, question)
        {
          id:         subject.id,
          characters: subject.characters,
          type:       subject.subject_type,
          level:      subject.level,
          meaning:    subject.primary_meaning,
          reading:    subject.primary_reading,
          phrase: {
            id:        question[:phrase_id]      || question["phrase_id"],
            japanese:  question[:japanese]       || question["japanese"],
            english:   question[:english_target] || question["english_target"],
            source:    question[:source]         || question["source"],
            source_id: question[:source_id]      || question["source_id"]
          }
        }
      end

      # Builds the post-answer vocab breakdown using the tokens we already
      # computed at session-build time. Each token that maps to a WK subject
      # the user has unlocked becomes an entry. Target is highlighted.
      def build_breakdown_from_tokens(question, target_subject)
        tokens = question[:tokens] || question["tokens"] || []
        target_id = target_subject.id

        # Take only tokens that successfully matched a WK subject
        matched = tokens.select do |t|
          (t[:subject_id] || t["subject_id"]).present?
        end

        # Deduplicate by subject_id (a vocab item may appear multiple times)
        seen_ids = Set.new
        uniq_matched = matched.select do |t|
          sid = t[:subject_id] || t["subject_id"]
          if seen_ids.include?(sid)
            false
          else
            seen_ids.add(sid)
            true
          end
        end

        breakdown = uniq_matched.map do |t|
          info = t[:subject_info] || t["subject_info"] || {}
          {
            subject_id: t[:subject_id] || t["subject_id"],
            characters: info[:characters] || info["characters"],
            reading:    info[:reading]    || info["reading"],
            meaning:    info[:meaning]    || info["meaning"],
            is_target:  (t[:subject_id] || t["subject_id"]) == target_id
          }
        end

        # Always include the target subject even if it didn't show up as a token
        # (could happen if the phrase doesn't actually contain it — defensive)
        unless breakdown.any? { |b| b[:is_target] }
          breakdown.unshift({
            subject_id: target_subject.id,
            characters: target_subject.characters,
            reading:    target_subject.primary_reading,
            meaning:    target_subject.primary_meaning,
            is_target:  true
          })
        end

        breakdown
      end

      def compute_srs_changes(session)
        subject_ids = session.practice_answers.distinct.pluck(:subject_id)
        states = LocalSrsState.where(
          user: current_user, subject_id: subject_ids, practice_kind: "sentence"
        ).index_by(&:subject_id)

        promoted = 0
        demoted = 0
        unchanged = 0

        session.practice_answers.group(:subject_id).count.each do |subject_id, _|
          state = states[subject_id]
          next unless state
          answers = session.practice_answers.where(subject_id: subject_id)
          c = answers.where(correct: true).count
          w = answers.where(correct: false).count
          if c > w
            promoted += 1
          elsif w > c
            demoted += 1
          else
            unchanged += 1
          end
        end

        { promoted: promoted, demoted: demoted, unchanged: unchanged }
      end

      # =========================
      # SHARED
      # =========================
      def record_and_respond(session, subject, question_type, user_answer, correct, expected:, subject_payload:, extra: {})
        questions = Rails.cache.read(session_questions_key(session.id)) || []
        index     = session.practice_answers.count

        PracticeAnswer.create!(
          practice_session: session,
          subject:          subject,
          question_type:    question_type,
          user_answer:      user_answer,
          correct:          correct
        )

        session.increment!(correct ? :correct_count : :incorrect_count)

        next_index    = index + 1
        next_question = questions[next_index]
        is_last       = next_question.nil?

        response = {
          correct:       correct,
          expected:      expected,
          subject:       subject_payload,
          next_question: next_question ? next_question.merge(index: next_index, total: questions.size) : nil,
          is_last:       is_last,
          progress: {
            answered: next_index,
            total:    questions.size,
            correct:  session.correct_count,
            wrong:    session.incorrect_count
          }
        }.merge(extra)

        render json: response
      end

      def parse_array(param)
        case param
        when Array  then param
        when String then param.split(",").map(&:strip).reject(&:blank?)
        else []
        end
      end

      def session_questions_key(session_id)
        "practice_session:#{current_user.id}:#{session_id}:questions"
      end

      def session_setup_key(session_id)
        "practice_session:#{current_user.id}:#{session_id}:setup"
      end

      def stored_setup_params(session)
        Rails.cache.read(session_setup_key(session.id)) || {
          session_type:  session.session_type,
          item_types:    session.item_types,
          levels:        session.level_range,
          practice_mode: session.practice_mode
        }
      end

      def session_payload(session)
        {
          id:              session.id,
          session_type:    session.session_type,
          practice_mode:   session.practice_mode,
          total_questions: session.total_questions,
          correct_count:   session.correct_count,
          incorrect_count: session.incorrect_count,
          status:          session.status,
          started_at:      session.started_at,
          completed_at:    session.completed_at,
          accuracy:        session.accuracy
        }
      end

      def subject_detail_payload(subject)
        {
          id:         subject.id,
          characters: subject.characters,
          type:       subject.subject_type,
          level:      subject.level,
          meanings:   subject.meanings,
          readings:   subject.readings
        }
      end

      def answer_summary_payload(answer, session)
        subject = answer.subject
        if session.session_type == "sentence"
          {
            subject_id:    subject.id,
            characters:    subject.characters,
            type:          subject.subject_type,
            level:         subject.level,
            question_type: answer.question_type,
            user_answer:   answer.user_answer,
            expected:      { primary: subject.primary_meaning, accepted: [subject.primary_meaning].compact }
          }
        else
          {
            subject_id:    subject.id,
            characters:    subject.characters,
            type:          subject.subject_type,
            level:         subject.level,
            question_type: answer.question_type,
            user_answer:   answer.user_answer,
            expected:      expected_answers(subject, answer.question_type)
          }
        end
      end

      def expected_answers(subject, question_type)
        case question_type
        when "meaning"
          {
            primary:  subject.primary_meaning,
            accepted: (subject.meanings || []).select { |m| m["accepted_answer"] }.map { |m| m["meaning"] }
          }
        when "reading"
          {
            primary:  subject.primary_reading,
            accepted: (subject.readings || []).select { |r| r["accepted_answer"] }.map { |r| r["reading"] }
          }
        else
          { primary: nil, accepted: [] }
        end
      end
    end
  end
end
