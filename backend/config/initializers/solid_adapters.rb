# Pin all the solid_* adapters to use the primary database.
# (You can split them onto a separate "queue" database for higher load,
#  but for the free tier, primary is fine.)

Rails.application.configure do
  config.solid_queue.connects_to = nil # uses primary
  config.solid_cache.connects_to = nil # uses primary
end
