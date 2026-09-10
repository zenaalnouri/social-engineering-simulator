"""
Application configuration.

Settings are loaded from environment variables (via a .env file at the
project root, read through python-dotenv). Three concrete configs are
provided (development, testing, production) plus a "default" alias.
"""

import os
from dotenv import load_dotenv

ADMIN_PASSWORDS = {
    "zena": "zena123",
    "soulaf": "soulaf123",
    "lara": "lara123",
    "bayan": "bayan123",
    "dr": "dr123",
}
ADMIN_NAMES = frozenset(ADMIN_PASSWORDS)

# Project root = one directory above /app
BASEDIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
INSTANCE_DIR = os.path.join(BASEDIR, "instance")
os.makedirs(INSTANCE_DIR, exist_ok=True)
load_dotenv(os.path.join(BASEDIR, ".env"))


def _database_uri():
    database_url = os.environ.get("DATABASE_URL")
    if database_url and database_url.startswith("postgres://"):
        return "postgresql://" + database_url[len("postgres://"):]
    # تم تعديل اسم ملف قاعدة البيانات بالأسفل ليكون database.db بدلاً من app.db ليطابق ملفك الأصلي المخزن داخل مجلد instance
    return database_url or f"sqlite:///{os.path.join(INSTANCE_DIR, 'database.db')}"


class Config:
    """Base configuration shared by all environments."""

    SECRET_KEY = os.environ.get(
        "SECRET_KEY", "dev-secret-key-change-in-production")

    SQLALCHEMY_DATABASE_URI = _database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")

    # Flask-RESTX settings
    RESTX_MASK_SWAGGER = False  # don't hide fields with X-Fields masking in Swagger UI
    ERROR_404_HELP = False  # don't append "did you mean" suggestions to 404s

    DEBUG = False
    TESTING = False


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


class ProductionConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = True


config_map = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
