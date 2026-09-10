"""Admin operations: scenario CRUD, question CRUD, results retrieval."""

from app.extensions import db
from app.models import (
    AttemptAnswer,
    AttemptScenario,
    Question,
    Result,
    Scenario,
    ScenarioState,
)
from app.utils.exceptions import NotFoundError, ValidationError
from app.utils.validators import validate_answer_choice, validate_non_empty_string


def _get_scenario_or_404(scenario_id):
    scenario = Scenario.query.get(scenario_id)
    if not scenario:
        raise NotFoundError("Scenario not found")
    return scenario


def list_scenarios(include_inactive=True):
    query = Scenario.query
    if not include_inactive:
        query = query.join(ScenarioState).filter(
            ScenarioState.is_active.is_(True))
    return query.order_by(Scenario.id).all()


def _scenario_text(payload, field, fallback=None):
    value = payload.get(field, fallback)
    return validate_non_empty_string(value, field)


def create_scenario(payload):
    scenario = Scenario(
        title=_scenario_text(payload, "title"),
        category=_scenario_text(payload, "category",
                                payload.get("type", "general")),
        description=_scenario_text(payload, "description"),
        option1=_scenario_text(payload, "option1"),
        option2=_scenario_text(payload, "option2"),
        option3=_scenario_text(payload, "option3"),
        option4=_scenario_text(payload, "option4"),
        correct_answer=_scenario_text(payload, "correct_answer"),
        explanation=_scenario_text(payload, "explanation"),
        warning_indicators=payload.get("warning_indicators", ""),
        title_en=_scenario_text(payload, "title_en", payload.get("title")),
        category_en=_scenario_text(
            payload, "category_en", payload.get("category", "general")),
        description_en=_scenario_text(
            payload, "description_en", payload.get("description")),
        option1_en=_scenario_text(
            payload, "option1_en", payload.get("option1")),
        option2_en=_scenario_text(
            payload, "option2_en", payload.get("option2")),
        option3_en=_scenario_text(
            payload, "option3_en", payload.get("option3")),
        option4_en=_scenario_text(
            payload, "option4_en", payload.get("option4")),
        explanation_en=_scenario_text(
            payload, "explanation_en", payload.get("explanation")),
        warning_indicators_en=payload.get("warning_indicators_en", ""),
    )
    db.session.add(scenario)
    db.session.commit()
    db.session.add(ScenarioState(scenario_id=scenario.id))
    db.session.add(Question(
        scenario_id=scenario.id,
        question=scenario.description,
        option_a=scenario.option1,
        option_b=scenario.option2,
        option_c=scenario.option3,
        option_d=scenario.option4,
        correct_answer=scenario.correct_answer,
    ))
    db.session.commit()
    return scenario


def update_scenario(scenario_id, payload):
    scenario = _get_scenario_or_404(scenario_id)

    fields = (
        "title", "category", "description", "option1", "option2", "option3",
        "option4", "correct_answer", "explanation", "warning_indicators",
        "title_en", "category_en", "description_en", "option1_en", "option2_en",
        "option3_en", "option4_en", "explanation_en", "warning_indicators_en",
    )
    for field in fields:
        if field in payload:
            value = payload[field]
            setattr(scenario, field, _scenario_text(payload, field) if field !=
                    "warning_indicators" and field != "warning_indicators_en" else value)

    question = Question.query.filter_by(scenario_id=scenario.id).first()
    if question:
        question.question = scenario.description
        question.option_a = scenario.option1
        question.option_b = scenario.option2
        question.option_c = scenario.option3
        question.option_d = scenario.option4
        question.correct_answer = scenario.correct_answer

    db.session.commit()
    return scenario


def delete_scenario(scenario_id):
    scenario = _get_scenario_or_404(scenario_id)
    AttemptAnswer.query.filter_by(scenario_id=scenario_id).delete()
    AttemptScenario.query.filter_by(scenario_id=scenario_id).delete()
    Question.query.filter_by(scenario_id=scenario_id).delete()
    db.session.delete(scenario)
    db.session.commit()


def set_scenario_active(scenario_id, is_active):
    scenario = _get_scenario_or_404(scenario_id)
    state = scenario.state
    if state is None:
        state = ScenarioState(scenario_id=scenario.id)
        db.session.add(state)
    state.is_active = is_active
    db.session.commit()
    return scenario


# ---------------------------------------------------------------------------
# Questions
# ---------------------------------------------------------------------------

def _get_question_or_404(question_id):
    question = Question.query.get(question_id)
    if not question:
        raise NotFoundError("Question not found")
    return question


def create_question(payload):
    scenario_id = payload.get("scenario_id")
    if not isinstance(scenario_id, int):
        raise ValidationError("'scenario_id' must be an integer")
    # 404s if the parent scenario doesn't exist
    _get_scenario_or_404(scenario_id)

    question_text = validate_non_empty_string(
        payload.get("question"), "question")
    option_a = validate_non_empty_string(payload.get("option_a"), "option_a")
    option_b = validate_non_empty_string(payload.get("option_b"), "option_b")
    option_c = validate_non_empty_string(payload.get("option_c"), "option_c")
    option_d = validate_non_empty_string(payload.get("option_d"), "option_d")
    correct_answer = validate_answer_choice(payload.get("correct_answer"))

    question = Question(
        scenario_id=scenario_id,
        question=question_text,
        option_a=option_a,
        option_b=option_b,
        option_c=option_c,
        option_d=option_d,
        correct_answer=correct_answer,
    )
    db.session.add(question)
    db.session.commit()
    return question


def update_question(question_id, payload):
    question = _get_question_or_404(question_id)

    if "question" in payload:
        question.question = validate_non_empty_string(
            payload["question"], "question")
    if "option_a" in payload:
        question.option_a = validate_non_empty_string(
            payload["option_a"], "option_a")
    if "option_b" in payload:
        question.option_b = validate_non_empty_string(
            payload["option_b"], "option_b")
    if "option_c" in payload:
        question.option_c = validate_non_empty_string(
            payload["option_c"], "option_c")
    if "option_d" in payload:
        question.option_d = validate_non_empty_string(
            payload["option_d"], "option_d")
    if "correct_answer" in payload:
        question.correct_answer = validate_answer_choice(
            payload["correct_answer"])

    db.session.commit()
    return question


def delete_question(question_id):
    question = _get_question_or_404(question_id)
    db.session.delete(question)
    db.session.commit()


# ---------------------------------------------------------------------------
# Results
# ---------------------------------------------------------------------------

def get_user_results(user_id=None):
    """Persistent results, optionally filtered to one user."""
    query = Result.query
    if user_id is not None:
        query = query.filter_by(user_id=user_id)
    return query.order_by(Result.date.desc()).all()
