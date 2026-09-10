"""POST /simulation/start, /simulation/answer, /simulation/finish."""

from flask import request
from flask_restx import Namespace, Resource, fields

from app.models import User
from app.services import simulation_service
from app.utils.exceptions import ValidationError, NotFoundError
from app.utils.responses import success_response

ns = Namespace(
    "simulation", description="Simulation lifecycle: start, answer, finish")

start_input_model = ns.model(
    "StartSimulationInput",
    {"user_id": fields.Integer(
        required=True, description="ID of the user starting the simulation")},
)

answer_input_model = ns.model(
    "SubmitAnswerInput",
    {
        "attempt_id": fields.Integer(required=True, description="ID of the simulation attempt"),
        "scenario_id": fields.Integer(required=True, description="ID of the scenario being answered"),
        "selected_answer": fields.String(required=True, description="Selected option: A, B, or C"),
    },
)

finish_input_model = ns.model(
    "FinishSimulationInput",
    {"attempt_id": fields.Integer(
        required=True, description="ID of the simulation attempt to finish")},
)


@ns.route("/start")
class StartSimulationResource(Resource):
    @ns.expect(start_input_model)
    @ns.response(201, "Simulation started")
    @ns.response(400, "Validation error")
    @ns.response(404, "User not found")
    @ns.response(409, "Not enough active scenarios available")
    def post(self):
        """Start a new simulation: randomly assigns 5 active scenarios to the user."""
        payload = request.get_json(silent=True) or {}
        user_id = payload.get("user_id")
        language = payload.get("language", "en")
        if not isinstance(user_id, int):
            raise ValidationError("'user_id' must be an integer")
        if language not in ("ar", "en"):
            language = "en"

        if not User.query.get(user_id):
            raise NotFoundError("User not found")

        attempt, scenarios = simulation_service.start_simulation(
            user_id, language)
        data = {
            "session_id": attempt.id,
            "attempt": attempt.to_dict(),
            "scenarios": scenarios,
        }
        return success_response(data=data, message="Simulation started", status_code=201)


@ns.route("/answer")
class SubmitAnswerResource(Resource):
    @ns.expect(answer_input_model)
    @ns.response(200, "Answer recorded")
    @ns.response(400, "Validation error")
    @ns.response(404, "Attempt or scenario not found")
    @ns.response(409, "Duplicate submission or attempt already finished")
    def post(self):
        """Submit an answer for one scenario within an in-progress simulation attempt."""
        payload = request.get_json(silent=True) or {}
        attempt_id = payload.get("attempt_id", payload.get("session_id"))
        scenario_id = payload.get("scenario_id")
        selected_answer = payload.get("selected_answer", payload.get("answer"))

        if not isinstance(attempt_id, int) or not isinstance(scenario_id, int):
            raise ValidationError(
                "'attempt_id' and 'scenario_id' must be integers")

        answer = simulation_service.submit_answer(
            attempt_id, scenario_id, selected_answer)
        is_english = answer.attempt.language == "en"
        explanation = (
            answer.scenario.explanation_en
            if is_english and answer.scenario.explanation_en
            else answer.scenario.explanation
        )
        warning_indicators = (
            answer.scenario.warning_indicators_en
            if is_english and answer.scenario.warning_indicators_en
            else answer.scenario.warning_indicators
        )
        data = answer.to_dict()
        arabic_flags = (
            answer.scenario.warning_indicators.split("•")
            if answer.scenario.warning_indicators
            else []
        )
        english_flags = (
            answer.scenario.warning_indicators_en.split("•")
            if answer.scenario.warning_indicators_en
            else []
        )

        data.update(
            {
                "explanation": explanation,
                "red_flags": (
                    warning_indicators.split("•")
                    if warning_indicators
                    else []
                ),
                "category": (
                    answer.scenario.category_en
                    if is_english and answer.scenario.category_en
                    else answer.scenario.category
                ),
                "explanation_ar": answer.scenario.explanation,
                "explanation_en": (
                    answer.scenario.explanation_en
                    or answer.scenario.explanation
                ),
                "red_flags_ar": arabic_flags,
                "red_flags_en": english_flags,
                "category_ar": answer.scenario.category,
                "category_en": (
                    answer.scenario.category_en
                    or answer.scenario.category
                ),
            }
        )
        return success_response(data=data, message="Answer recorded")


@ns.route("/finish")
class FinishSimulationResource(Resource):
    @ns.expect(finish_input_model)
    @ns.response(200, "Simulation finished")
    @ns.response(400, "Not all scenarios have been answered yet")
    @ns.response(404, "Attempt not found")
    @ns.response(409, "Attempt already finished")
    def post(self):
        """Finish a simulation attempt: calculates score, percentage, and awareness level."""
        payload = request.get_json(silent=True) or {}
        attempt_id = payload.get("attempt_id", payload.get("session_id"))
        if not isinstance(attempt_id, int):
            raise ValidationError("'attempt_id' must be an integer")

        attempt, result = simulation_service.finish_simulation(attempt_id)
        data = result.to_dict(total_questions=attempt.total_questions)
        data["attempt_id"] = attempt.id
        return success_response(data=data, message="Simulation finished")
