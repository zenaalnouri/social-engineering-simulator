"""
Application factory.

create_app() wires config, extensions, models, namespaces (Swagger
docs live at /docs), and centralized error handlers together, and
returns a ready-to-run Flask app.
"""

import os

from flask import Flask, jsonify, request, send_from_directory, session
from sqlalchemy import inspect, text

from app.config import ADMIN_PASSWORDS, config_map
from app.extensions import db, migrate, cors, api
from app.utils.exceptions import register_error_handlers


def create_app(config_name=None):
    frontend_dir = os.path.abspath(os.path.join(
        os.path.dirname(__file__), "..", "frontend"))
    app = Flask(__name__, static_folder=frontend_dir, static_url_path="")

    @app.get("/")
    def frontend_index():
        return send_from_directory(frontend_dir, "index.html")

    for directory in ("pages", "css", "js", "images", "assets"):
        app.add_url_rule(
            f"/{directory}/<path:filename>",
            f"frontend_{directory}",
            lambda filename, directory=directory: send_from_directory(
                os.path.join(frontend_dir, directory), filename
            ),
        )

    config_name = config_name or os.environ.get("FLASK_ENV", "development")
    app.config.from_object(config_map.get(config_name, config_map["default"]))
    if config_name == "production" and not os.environ.get("SECRET_KEY"):
        raise RuntimeError("SECRET_KEY must be set when FLASK_ENV=production")

    @app.before_request
    def require_admin_login():
        if request.path.startswith("/admin") and not request.path.endswith(("/login", "/logout")):
            if "admin_username" not in session:
                return jsonify({
                    "success": False,
                    "message": "Admin login required",
                    "error": {},
                }), 401

    # --- Extensions ---
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, origins=app.config["CORS_ORIGINS"])
    api.init_app(app)

    # Import models so Flask-Migrate can detect the schema
    from app import models  # noqa: F401

    # The uploaded database already owns Users and Scenarios. Create only
    # the internal simulation tables that are not part of that file.
    with app.app_context():
        db.create_all()
        inspector = inspect(db.engine)
        attempt_columns = {
            column["name"]
            for column in inspector.get_columns("simulation_attempts")
        }
        if "language" not in attempt_columns:
            db.session.execute(
                text(
                    "ALTER TABLE simulation_attempts "
                    "ADD COLUMN language VARCHAR(2) NOT NULL DEFAULT 'ar'"
                )
            )
            db.session.commit()

        for scenario in models.Scenario.query.all():
            if scenario.state is None:
                db.session.add(models.ScenarioState(scenario_id=scenario.id))
        db.session.commit()

        for scenario in models.Scenario.query.all():
            if not scenario.questions:
                correct_answer = {
                    "Option 1": "A",
                    "Option 2": "B",
                    "Option 3": "C",
                    "Option 4": "D",
                }.get(scenario.correct_answer, "A")
                db.session.add(
                    models.Question(
                        scenario_id=scenario.id,
                        question=scenario.description,
                        option_a=scenario.option1,
                        option_b=scenario.option2,
                        option_c=scenario.option3,
                        option_d=scenario.option4,
                        correct_answer=correct_answer,
                    )
                )
        db.session.commit()

        for username, password in ADMIN_PASSWORDS.items():
            user = models.User.query.filter_by(username=username).first()
            if user is None:
                db.session.add(models.User(
                    username=username, password=password))
            elif not user.password:
                user.password = password
        db.session.commit()

    # --- Namespaces (each module's `ns` is a Flask-RESTX Namespace) ---
    from app.routes.user import ns as user_ns
    from app.routes.simulation import ns as simulation_ns
    from app.routes.leaderboard import ns as leaderboard_ns
    from app.routes.admin import ns as admin_ns
    from app.routes.analytics import ns as analytics_ns
    from app.routes.reports import ns as reports_ns
    from app.routes.alerts import ns as alerts_ns
    from app.routes.results import ns as results_ns

    api.add_namespace(user_ns, path="/users")
    api.add_namespace(simulation_ns, path="/simulation")
    api.add_namespace(leaderboard_ns, path="/leaderboard")
    api.add_namespace(admin_ns, path="/admin")
    api.add_namespace(analytics_ns, path="/analytics")
    api.add_namespace(reports_ns, path="/reports")
    api.add_namespace(alerts_ns, path="/alerts")
    api.add_namespace(results_ns, path="/results")

    # --- Errors ---
    register_error_handlers(api)

    return app
