Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(
      "http://localhost:5173",                      # dev
      "https://kani-companion.pages.dev",        # cloudflare default
      "https://*.kani-companion.pages.dev",      # preview branches
      "https://kanicompanion.com"                   # custom domain (later)
    )
    resource "*",
      headers: :any,
      methods: %i[get post put patch delete options head],
      expose: %w[Authorization]
  end
end