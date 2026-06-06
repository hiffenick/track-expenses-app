import os
from datetime import timedelta
import tempfile
from urllib.parse import quote_plus
from dotenv import load_dotenv
load_dotenv()

class Config:
    # ── Database Credentials ────────────────────────────────────
    DB_USER     = os.getenv("DB_USER")
    DB_SERVER   = os.getenv("DB_SERVER")
    DB_PASS_RAW = os.getenv("DB_PASS")
    DB_PASS     = quote_plus(DB_PASS_RAW)
    DB_NAME     = os.getenv("DB_NAME")

    # ── Secret Key ──────────────────────────────────────────────
    SECRET_KEY = os.getenv("SECRET_KEY")

    # ── Mail ────────────────────────────────────────────────────
    MAIL_SERVER         = os.getenv("MAIL_SERVER")
    MAIL_PORT           = int(os.getenv("MAIL_PORT"))
    MAIL_USE_TLS        = os.getenv("MAIL_USE_TLS", "true").lower() in ['true', '1', 'yes']
    MAIL_USERNAME       = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD       = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER")
    MAIL_USE_SSL = True

    # ── Database ────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"mssql+pyodbc://{DB_USER}:{DB_PASS}@{DB_SERVER}/{DB_NAME}"
        "?driver=ODBC+Driver+17+for+SQL+Server"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ── Session & Cookie Security ───────────────────────────────
    # Server-side session timeout (idle = auto logout)
    PERMANENT_SESSION_LIFETIME = timedelta(
        minutes=int(os.getenv("SESSION_LIFETIME_MINUTES", 30))
    )

    # Prevent JS from reading the session cookie (XSS protection)
    SESSION_COOKIE_HTTPONLY = True

    # Cookie only sent over HTTPS in production
    SESSION_COOKIE_SECURE = os.getenv("FLASK_ENV", "development") == "production"

    # Strict SameSite prevents CSRF via cross-site requests
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_TYPE = 'filesystem'
    SESSION_FILE_DIR = os.path.join(os.path.abspath(os.path.dirname(__file__)), '..', 'flask_sessions')
    SESSION_USE_SIGNER = True

    # Cookie name (optional, obscures framework fingerprinting)
    SESSION_COOKIE_NAME = "expenso_session"

    REMEMBER_COOKIE_DURATION = timedelta(seconds=0)
    REMEMBER_COOKIE_NAME = 'remember_token'  # so we know what to look for
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SECURE   = os.getenv("FLASK_ENV", "development") == "production"
    REMEMBER_COOKIE_SAMESITE = "Lax"