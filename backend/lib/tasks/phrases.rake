namespace :phrases do
  desc "Download Tatoeba bulk files and import Japanese sentences as phrases"
  task import_tatoeba: :environment do
    puts "==> Tatoeba phrase import starting"
    downloader = Tatoeba::Downloader.new
    sentences_path, links_path = downloader.fetch_all

    puts "==> Files ready, starting importer"
    importer = Tatoeba::Importer.new(
      sentences_path: sentences_path,
      links_path:     links_path
    )
    importer.call
    puts "==> Tatoeba import done"
  end

  desc "Import context sentences from already-synced WaniKani subjects"
  task import_wanikani: :environment do
    puts "==> WaniKani context sentence import starting"
    Wanikani::ContextSentenceImporter.new.call
    puts "==> WaniKani context sentence import done"
  end

  desc "Run both imports in sequence"
  task import_all: %i[import_wanikani import_tatoeba]

  desc "Show phrase counts by source"
  task stats: :environment do
    puts "Phrase counts:"
    Phrase.group(:source).count.each do |source, count|
      puts "  #{source}: #{count}"
    end
    puts "Subject coverage:"
    total_subjects = Subject.where(subject_type: %w[kanji vocabulary]).count
    with_phrases = PhraseSubject.distinct.count(:subject_id)
    puts "  #{with_phrases} / #{total_subjects} subjects have at least one phrase"
  end

  desc "Reset all phrases (DANGER: drops all phrase data)"
  task reset: :environment do
    print "This will delete ALL phrases and phrase_subjects. Type 'yes' to continue: "
    confirm = STDIN.gets.chomp
    abort "Aborted" unless confirm == "yes"

    PhraseSubject.delete_all
    Phrase.delete_all
    puts "Phrases reset."
  end
end
