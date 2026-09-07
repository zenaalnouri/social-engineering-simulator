"""
Flask extension instances.

Instances are created here without an app bound to them, then wired
to the real Flask app inside the application factory
(app/__init__.py::create_app). This avoids circular imports, since
route/service modules can import these instances directly.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_restx import Api

db = SQLAlchemy()
migrate = Migrate()
cors = CORS()

api = Api(
    title="Social Engineering Simulator API",
    version="1.0",
    description=(
        "Backend API for the Social Engineering Simulator, an interactive "
        "cybersecurity awareness platform. Manages users, randomized "
        "social-engineering scenarios, scoring, analytics, reports, "
        "leaderboards, and admin content management."
    ),
    doc="/docs",  # Swagger UI is served at /docs
)
