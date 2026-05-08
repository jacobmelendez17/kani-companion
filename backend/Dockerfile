# syntax=docker/dockerfile:1
# Multi-stage build for Rails 8 on Fly.io

ARG RUBY_VERSION=3.3.5
FROM ruby:3.3.5-slim

# Install MeCab + dependencies
RUN apt-get update -qq && apt-get install -y \
    build-essential libpq-dev curl mecab libmecab-dev mecab-ipadic-utf8 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache gems separately for faster rebuilds
COPY Gemfile Gemfile.lock ./
RUN gem install bundler && bundle install --jobs=4 --retry=3 --without development test

COPY . .

# Pre-compile bootsnap for faster boot
RUN bundle exec bootsnap precompile app/ lib/ config/ || true

ENV RAILS_ENV=production
ENV RAILS_LOG_TO_STDOUT=true
ENV RAILS_SERVE_STATIC_FILES=true

EXPOSE 8080

CMD ["bin/rails", "server", "-b", "0.0.0.0", "-p", "8080"]