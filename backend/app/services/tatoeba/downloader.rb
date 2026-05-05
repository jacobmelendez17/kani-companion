require "open-uri"
require "fileutils"
require "csv"
require "zlib"

module Tatoeba
  # Downloads and caches the Tatoeba bulk export files we need.
  #
  # Tatoeba publishes daily bulk exports as bzip2/gzip archives at:
  # https://downloads.tatoeba.org/exports/
  #
  # Files we use:
  #   - sentences.tar.bz2          : All sentences (lang, id, text)
  #   - links.csv                  : Translation pairs (id_a, id_b)
  #
  # We extract Japanese sentences and their English translations, then write
  # to local CSV files for the importer to consume.
  class Downloader
    BASE_URL = "https://downloads.tatoeba.org/exports".freeze
    CACHE_DIR = Rails.root.join("tmp", "tatoeba").freeze

    def initialize(logger: Rails.logger)
      @logger = logger
      FileUtils.mkdir_p(CACHE_DIR)
    end

    # Returns paths to the local sentences and links files.
    def fetch_all
      sentences_path = fetch_sentences
      links_path     = fetch_links
      [sentences_path, links_path]
    end

    private

    def fetch_sentences
      target = CACHE_DIR.join("sentences.csv")
      return target if File.exist?(target) && fresh?(target)

      @logger.info "[Tatoeba] Downloading sentences (this may take a while, ~80MB)…"
      url = "#{BASE_URL}/sentences.tar.bz2"

      tar_path = CACHE_DIR.join("sentences.tar.bz2")
      download_file(url, tar_path)

      @logger.info "[Tatoeba] Extracting sentences…"
      # The tar.bz2 contains a single sentences.csv file
      system("tar", "-xjf", tar_path.to_s, "-C", CACHE_DIR.to_s) || raise("tar extraction failed")

      target
    end

    def fetch_links
      target = CACHE_DIR.join("links.csv")
      return target if File.exist?(target) && fresh?(target)

      @logger.info "[Tatoeba] Downloading links…"
      url = "#{BASE_URL}/links.tar.bz2"

      tar_path = CACHE_DIR.join("links.tar.bz2")
      download_file(url, tar_path)

      @logger.info "[Tatoeba] Extracting links…"
      system("tar", "-xjf", tar_path.to_s, "-C", CACHE_DIR.to_s) || raise("tar extraction failed")

      target
    end

    def download_file(url, target_path)
      File.open(target_path, "wb") do |dst|
        URI.open(url, "rb", read_timeout: 600) do |src|
          IO.copy_stream(src, dst)
        end
      end
    end

    # Consider files <30 days old as fresh. Tatoeba updates infrequently.
    def fresh?(path)
      File.mtime(path) > 30.days.ago
    end
  end
end
