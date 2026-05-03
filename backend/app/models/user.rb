class User < ApplicationRecord
  has_secure_password

  has_one :wanikani_profile, dependent: :destroy
  has_many :sessions, dependent: :destroy
  has_many :assignments, dependent: :destroy
  has_many :study_materials, dependent: :destroy
  has_many :practice_sessions, dependent: :destroy
  has_many :practice_settings, dependent: :destroy
  has_many :local_srs_states, dependent: :destroy

  validates :email,
            presence: true,
            uniqueness: { case_sensitive: false },
            format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :username,
            presence: true,
            uniqueness: { case_sensitive: false },
            length: { minimum: 3, maximum: 30 },
            format: { with: /\A[a-zA-Z0-9_]+\z/, message: "letters, numbers, and underscores only" }

  normalizes :email, with: ->(e) { e.strip.downcase }
  normalizes :username, with: ->(u) { u.strip }

  before_create :generate_session_token
  after_create :create_default_settings

  private

  def generate_session_token
    self.session_token ||= SecureRandom.hex(32)
  end

  def create_default_settings
    PracticeSetting.create_defaults_for(self)
  end
end