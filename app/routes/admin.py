"""
Admin endpoints, all mounted under /admin:

  Scenarios: GET/POST /admin/scenarios,
             PUT/DELETE /admin/scenarios/<id>,
             POST /admin/scenarios/<id>/activate, .../deactivate
  Questions: POST /admin/questions, 
             PUT/DELETE /admin/questions/<id>
  Results:   GET /admin/results/users/<user_id>, 
             GET /admin/results/simulations
"""

from flask import request, session
from flask_restx import Namespace, Resource, fields

from app.config import ADMIN_NAMES
from app.models import Result, ScamAlert, Scenario, User
from app.services import admin_service
from app.utils.responses import success_response

ns = Namespace(
    "admin", description="Admin: scenario/question management and results")


def scenario_admin_data(scenario):
    return {
        "id": scenario.id,
        "title": scenario.title,
        "category": scenario.category,
        "description": scenario.description,
        "option1": scenario.option1,
        "option2": scenario.option2,
        "option3": scenario.option3,
        "option4": scenario.option4,
        "correct_answer": scenario.correct_answer,
        "explanation": scenario.explanation,
        "warning_indicators": scenario.warning_indicators or "",
        "title_en": scenario.title_en or scenario.title,
        "category_en": scenario.category_en or scenario.category,
        "description_en": scenario.description_en or scenario.description,
        "option1_en": scenario.option1_en or scenario.option1,
        "option2_en": scenario.option2_en or scenario.option2,
        "option3_en": scenario.option3_en or scenario.option3,
        "option4_en": scenario.option4_en or scenario.option4,
        "explanation_en": scenario.explanation_en or scenario.explanation,
        "warning_indicators_en": scenario.warning_indicators_en or "",
        "options": {
            "A": scenario.option1,
            "B": scenario.option2,
            "C": scenario.option3,
            "D": scenario.option4,
        },
    }


@ns.route("/login")
class AdminLoginResource(Resource):
    def post(self):
        payload = request.get_json(silent=True) or {}
        username = str(payload.get("username", "")).strip().lower()
        password = str(payload.get("password", ""))
        user = User.query.filter_by(username=username).first()
        if not user or username not in ADMIN_NAMES or user.password != password:
            return {"success": False, "message": "Invalid admin credentials", "error": {}}, 401
        session["admin_username"] = username
        return success_response(data={"username": username}, message="Admin login successful")


@ns.route("/logout")
class AdminLogoutResource(Resource):
    def post(self):
        session.pop("admin_username", None)
        return success_response(data={}, message="Admin logged out")


@ns.route("/dashboard")
class AdminDashboardResource(Resource):
    def get(self):
        return success_response(
            data={
                "users": User.query.filter(~User.username.in_(ADMIN_NAMES)).count(),
                "admin_users": User.query.filter(User.username.in_(ADMIN_NAMES)).count(),
                "scenarios": Scenario.query.count(),
                "alerts": ScamAlert.query.count(),
                "results": Result.query.count(),
            },
            message="Admin dashboard retrieved",
        )


@ns.route("/alerts")
class AdminAlertsResource(Resource):
    def get(self):
        return success_response(
            data=[
                {
                    "id": alert.id,
                    "title": alert.title,
                    "description": alert.description,
                    "title_en": alert.title_en,
                    "description_en": alert.description_en,
                }
                for alert in ScamAlert.query.order_by(ScamAlert.id).all()
            ],
            message="Admin alerts retrieved",
        )


@ns.route("/alerts/<int:alert_id>")
@ns.param("alert_id", "The alert identifier")
class AdminAlertResource(Resource):
    def get(self, alert_id):
        alert = ScamAlert.query.get_or_404(alert_id)
        return success_response(data=alert.to_dict("en"), message="Alert retrieved")


@ns.route("/results")
class AdminResultsResource(Resource):
    def get(self):
        return success_response(
            data=[result.to_dict()
                  for result in Result.query.order_by(Result.date.desc()).all()],
            message="Saved results retrieved",
        )


scenario_model = ns.model(
    "ScenarioInput",
    {
        "title": fields.String(required=True),
        "category": fields.String(required=True),
        "description": fields.String(required=True),
        "option1": fields.String(required=True),
        "option2": fields.String(required=True),
        "option3": fields.String(required=True),
        "option4": fields.String(required=True),
        "correct_answer": fields.String(required=True, description="A | B | C | D"),
        "explanation": fields.String(required=True),
        "title_en": fields.String(),
        "category_en": fields.String(),
        "description_en": fields.String(),
        "option1_en": fields.String(),
        "option2_en": fields.String(),
        "option3_en": fields.String(),
        "option4_en": fields.String(),
        "explanation_en": fields.String(),
    },
)

question_model = ns.model(
    "QuestionInput",
    {
        "scenario_id": fields.Integer(required=True),
        "question": fields.String(required=True),
        "option_a": fields.String(required=True),
        "option_b": fields.String(required=True),
        "option_c": fields.String(required=True),
        "correct_answer": fields.String(required=True, description="A | B | C"),
    },
)


# ---------------------------------------------------------------------------
# Scenarios
# ---------------------------------------------------------------------------

@ns.route("/scenarios")
class ScenarioListResource(Resource):
    @ns.response(200, "Scenarios retrieved")
    def get(self):
        """List every scenario (active and inactive)."""
        scenarios = admin_service.list_scenarios(include_inactive=True)
        return success_response(
            data=[scenario_admin_data(s) for s in scenarios], message="Scenarios retrieved"
        )

    @ns.expect(scenario_model)
    @ns.response(201, "Scenario created")
    @ns.response(400, "Validation error")
    def post(self):
        """Create a new scenario."""
        payload = request.get_json(silent=True) or {}
        scenario = admin_service.create_scenario(payload)
        return success_response(
            data=scenario_admin_data(scenario), message="Scenario created", status_code=201
        )


@ns.route("/scenarios/<int:scenario_id>")
@ns.param("scenario_id", "The scenario identifier")
class ScenarioResource(Resource):
    @ns.expect(scenario_model)
    @ns.response(200, "Scenario updated")
    @ns.response(400, "Validation error")
    @ns.response(404, "Scenario not found")
    def put(self, scenario_id):
        """Update an existing scenario (partial updates supported)."""
        payload = request.get_json(silent=True) or {}
        scenario = admin_service.update_scenario(scenario_id, payload)
        return success_response(data=scenario_admin_data(scenario), message="Scenario updated")

    @ns.response(200, "Scenario deleted")
    @ns.response(404, "Scenario not found")
    def delete(self, scenario_id):
        """Delete a scenario (and its questions, via cascade)."""
        admin_service.delete_scenario(scenario_id)
        return success_response(data={}, message="Scenario deleted")


@ns.route("/scenarios/<int:scenario_id>/activate")
@ns.param("scenario_id", "The scenario identifier")
class ScenarioActivateResource(Resource):
    @ns.response(200, "Scenario activated")
    @ns.response(404, "Scenario not found")
    def post(self, scenario_id):
        """Activate a scenario, making it eligible for future simulations."""
        scenario = admin_service.set_scenario_active(scenario_id, True)
        return success_response(data=scenario.to_dict(), message="Scenario activated")


@ns.route("/scenarios/<int:scenario_id>/deactivate")
@ns.param("scenario_id", "The scenario identifier")
class ScenarioDeactivateResource(Resource):
    @ns.response(200, "Scenario deactivated")
    @ns.response(404, "Scenario not found")
    def post(self, scenario_id):
        """Deactivate a scenario, excluding it from future simulations."""
        scenario = admin_service.set_scenario_active(scenario_id, False)
        return success_response(data=scenario.to_dict(), message="Scenario deactivated")


# ---------------------------------------------------------------------------
# Questions
# ---------------------------------------------------------------------------

@ns.route("/questions")
class QuestionListResource(Resource):
    @ns.expect(question_model)
    @ns.response(201, "Question created")
    @ns.response(400, "Validation error")
    @ns.response(404, "Scenario not found")
    def post(self):
        """Add a question to an existing scenario."""
        payload = request.get_json(silent=True) or {}
        question = admin_service.create_question(payload)
        return success_response(
            data=question.to_dict(include_answer=True),
            message="Question created",
            status_code=201,
        )


@ns.route("/questions/<int:question_id>")
@ns.param("question_id", "The question identifier")
class QuestionResource(Resource):
    @ns.expect(question_model)
    @ns.response(200, "Question updated")
    @ns.response(400, "Validation error")
    @ns.response(404, "Question not found")
    def put(self, question_id):
        """Update an existing question (partial updates supported)."""
        payload = request.get_json(silent=True) or {}
        question = admin_service.update_question(question_id, payload)
        return success_response(
            data=question.to_dict(include_answer=True), message="Question updated"
        )

    @ns.response(200, "Question deleted")
    @ns.response(404, "Question not found")
    def delete(self, question_id):
        """Delete a question."""
        admin_service.delete_question(question_id)
        return success_response(data={}, message="Question deleted")


# ---------------------------------------------------------------------------
# Results
# ---------------------------------------------------------------------------

@ns.route("/results/users/<int:user_id>")
@ns.param("user_id", "The user identifier")
class UserResultsResource(Resource):
    @ns.response(200, "User results retrieved")
    def get(self, user_id):
        """View every completed simulation result for one user."""
        attempts = admin_service.get_user_results(user_id=user_id)
        return success_response(
            data=[a.to_dict() for a in attempts], message="User results retrieved"
        )


@ns.route("/results/simulations")
class CompletedSimulationsResource(Resource):
    @ns.response(200, "Completed simulations retrieved")
    def get(self):
        """View every completed simulation across all users."""
        attempts = admin_service.get_user_results(user_id=None)
        return success_response(
            data=[a.to_dict() for a in attempts],
            message="Completed simulations retrieved",
        )
