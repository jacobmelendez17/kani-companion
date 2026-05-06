module Api
  module V1
    module Admin
      class PhrasesController < BaseController
        # GET /api/v1/admin/phrases/search_subjects?q=...
        # Returns matching kanji/vocab subjects so admin can find which item to manage phrases for.
        def search_subjects
          q = params[:q].to_s.strip
          return render json: { subjects: [] } if q.blank?

          # Search by characters (Japanese), primary meaning (English), or level
          subjects = Subject.where(subject_type: %w[kanji vocabulary])
                            .where("characters ILIKE ? OR characters = ?", "%#{q}%", q)
                            .limit(20)
                            .order(:level)

          # Also match by primary meaning if the query is English
          if subjects.size < 5 && q.match?(/\A[a-zA-Z\s]+\z/)
            meaning_matches = Subject.where(subject_type: %w[kanji vocabulary])
                                     .where("meanings::text ILIKE ?", "%#{q.downcase}%")
                                     .limit(15)
                                     .order(:level)
            subjects = (subjects.to_a + meaning_matches.to_a).uniq.first(20)
          end

          render json: {
            subjects: subjects.map { |s|
              phrase_count = s.phrase_subjects.count
              {
                id:         s.id,
                characters: s.characters,
                type:       s.subject_type,
                level:      s.level,
                meaning:    s.primary_meaning,
                reading:    s.primary_reading,
                phrase_count: phrase_count
              }
            }
          }
        end

        # GET /api/v1/admin/phrases?subject_id=X
        # Returns all phrases for a subject in their current admin order.
        def index
          subject = Subject.find(params[:subject_id])

          rows = subject.phrase_subjects.ordered.includes(:phrase)

          render json: {
            subject: {
              id:         subject.id,
              characters: subject.characters,
              type:       subject.subject_type,
              level:      subject.level,
              meaning:    subject.primary_meaning
            },
            phrases: rows.map { |ps|
              {
                id:                ps.phrase.id,
                phrase_subject_id: ps.id,
                japanese:          ps.phrase.japanese,
                english:           ps.phrase.english,
                source:            ps.phrase.source,
                source_id:         ps.phrase.source_id,
                length:            ps.phrase.length,
                length_bucket:     ps.phrase.length_bucket,
                position:          ps.position,
                is_primary:        ps.is_primary
              }
            }
          }
        end

        # POST /api/v1/admin/phrases
        # Creates a new phrase and links it to one or more subjects.
        # Body: { japanese, english, target_subject_ids: [], length_bucket }
        def create
          japanese = params[:japanese].to_s.strip
          english  = params[:english].to_s.strip
          target_ids = Array(params[:target_subject_ids]).map(&:to_i)
          length_bucket = params[:length_bucket].present? ? params[:length_bucket].to_i : nil

          if japanese.blank? || english.blank? || target_ids.empty?
            return render json: { error: "japanese, english, and target_subject_ids are required" },
                          status: :unprocessable_entity
          end

          length = japanese.length
          length_bucket ||= ::Phrase.bucket_for(length)

          phrase = nil
          ::Phrase.transaction do
            phrase = ::Phrase.create!(
              japanese:      japanese,
              english:       english,
              source:        "admin",
              source_id:     "admin-#{SecureRandom.hex(6)}",
              length:        length,
              length_bucket: length_bucket
            )

            target_ids.each_with_index do |subject_id, idx|
              # New manually-added phrases get the LOWEST available position
              # in each subject they're linked to so they show up first.
              max_position = ::PhraseSubject.where(subject_id: subject_id).where.not(position: nil).maximum(:position) || 0
              ::PhraseSubject.create!(
                phrase_id:  phrase.id,
                subject_id: subject_id,
                is_primary: idx == 0,
                position:   max_position + 1
              )
            end
          end

          render json: { phrase: { id: phrase.id, japanese: phrase.japanese, english: phrase.english } },
                 status: :created
        end

        # PATCH /api/v1/admin/phrases/:id
        # Body: { japanese?, english? }
        # Updates phrase content. Length and length_bucket are recomputed.
        def update
          phrase = ::Phrase.find(params[:id])

          attrs = {}
          if params[:japanese].present?
            attrs[:japanese] = params[:japanese].to_s.strip
            attrs[:length] = attrs[:japanese].length
            attrs[:length_bucket] = ::Phrase.bucket_for(attrs[:length])
          end
          attrs[:english] = params[:english].to_s.strip if params[:english].present?

          phrase.update!(attrs)
          render json: { phrase: { id: phrase.id, japanese: phrase.japanese, english: phrase.english } }
        end

        # DELETE /api/v1/admin/phrases/:id
        def destroy
          phrase = ::Phrase.find(params[:id])
          phrase.destroy!
          head :no_content
        end

        # POST /api/v1/admin/phrases/reorder
        # Body: { subject_id, ordered_phrase_subject_ids: [id, id, id, ...] }
        # Sets position 1, 2, 3, ... in the order received.
        def reorder
          subject_id = params[:subject_id].to_i
          ordered_ids = Array(params[:ordered_phrase_subject_ids]).map(&:to_i)

          if subject_id.zero? || ordered_ids.empty?
            return render json: { error: "subject_id and ordered_phrase_subject_ids required" },
                          status: :unprocessable_entity
          end

          ::PhraseSubject.transaction do
            ordered_ids.each_with_index do |ps_id, idx|
              ::PhraseSubject.where(id: ps_id, subject_id: subject_id)
                             .update_all(position: idx + 1)
            end
          end

          head :no_content
        end
      end
    end
  end
end
