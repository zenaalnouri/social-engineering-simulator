"""
Core simulation lifecycle: start -> answer (x5) -> finish.

start_simulation   picks 5 random ACTIVE scenarios (each with at least
                    one question) and opens a new attempt.
submit_answer      validates + records one answer, updates the
                    scenario's live analytics counters.
finish_simulation  once all scenarios are answered, computes score,
                    percentage, and awareness level.
"""

import random
from datetime import datetime

from app.extensions import db
from app.models import (
    Scenario,
    Question,
    SimulationAttempt,
    AttemptScenario,
    AttemptAnswer,
    Result,
)
from app.utils.exceptions import ValidationError, NotFoundError, ConflictError
from app.utils.validators import validate_answer_choice

SCENARIOS_PER_SIMULATION = 5

# (lower_bound, upper_bound, label) -- checked in order, inclusive
AWARENESS_LEVELS = (
    (90, 100, "Expert"),
    (70, 89, "Advanced"),
    (50, 69, "Intermediate"),
    (0, 49, "Needs Improvement"),
)


def calculate_awareness_level(percentage):
    for lower, upper, label in AWARENESS_LEVELS:
        if lower <= percentage <= upper:
            return label
    return "Needs Improvement"


def _get_attempt_or_404(attempt_id):
    attempt = SimulationAttempt.query.get(attempt_id)
    if not attempt:
        raise NotFoundError("Simulation attempt not found")
    return attempt


def start_simulation(user_id, language="ar"):
    """
    Randomly select SCENARIOS_PER_SIMULATION active scenarios (no
    duplicates, random every call) and open a new attempt for them.

    Returns (attempt, scenario_payload) where scenario_payload is a
    list of dicts safe to send to the client (no correct answers).
    """
    available_scenarios = Scenario.query.order_by(Scenario.id).all()
    eligible = [
        scenario for scenario in available_scenarios if scenario.questions]

    if len(eligible) < SCENARIOS_PER_SIMULATION:
        raise ConflictError(
            "Not enough active scenarios with at least one question available. "
            f"Need {SCENARIOS_PER_SIMULATION}, found {len(eligible)}."
        )

    selected = random.sample(eligible, SCENARIOS_PER_SIMULATION)

    attempt = SimulationAttempt(
        user_id=user_id,
        status=SimulationAttempt.STATUS_IN_PROGRESS,
        total_questions=SCENARIOS_PER_SIMULATION,
    )
    db.session.add(attempt)
    db.session.flush()  # assigns attempt.id without committing yet

    scenario_payload = []
    for index, scenario in enumerate(selected):
        question = random.choice(scenario.questions)

        db.session.add(
            AttemptScenario(
                attempt_id=attempt.id,
                scenario_id=scenario.id,
                question_id=question.id,
                order_index=index,
            )
        )

        payload = scenario.to_dict(
            include_stats=False, include_answer=False, language=language
        )
        payload["question"] = question.to_dict(include_answer=False)
        options = payload["options"]
        payload["answers"] = [
            {"id": 1, "text": options["A"]},
            {"id": 2, "text": options["B"]},
            {"id": 3, "text": options["C"]},
            {"id": 4, "text": options["D"]},
        ]
        scenario_payload.append(payload)

    db.session.commit()
    return attempt, scenario_payload


def submit_answer(attempt_id, scenario_id, selected_answer, language="ar"):
    """Validate and record one answer within an in-progress attempt."""
    attempt = _get_attempt_or_404(attempt_id)

    if attempt.status == SimulationAttempt.STATUS_COMPLETED:
        raise ConflictError(
            "This simulation attempt has already been finished")

    selected_answer = validate_answer_choice(selected_answer)

    link = AttemptScenario.query.filter_by(
        attempt_id=attempt_id, scenario_id=scenario_id
    ).first()
    if not link:
        raise ValidationError(
            "This scenario is not part of the given simulation attempt"
        )

    duplicate = AttemptAnswer.query.filter_by(
        attempt_id=attempt_id, scenario_id=scenario_id
    ).first()
    if duplicate:
        raise ConflictError(
            "This scenario has already been answered in this attempt")

    question = Question.query.get(link.question_id)
    if not question:
        raise NotFoundError("Question not found for this scenario")

    is_correct = selected_answer == question.correct_answer.upper()

    answer = AttemptAnswer(
        attempt_id=attempt_id,
        scenario_id=scenario_id,
        question_id=question.id,
        selected_answer=selected_answer,
        is_correct=is_correct,
    )
    db.session.add(answer)

    db.session.commit()
    return answer


def finish_simulation(attempt_id):
    """Finalize an attempt once every assigned scenario has been answered."""
    attempt = _get_attempt_or_404(attempt_id)

    if attempt.status == SimulationAttempt.STATUS_COMPLETED:
        raise ConflictError(
            "This simulation attempt has already been finished")

    total_answered = AttemptAnswer.query.filter_by(
        attempt_id=attempt_id).count()
    if total_answered < attempt.total_questions:
        raise ValidationError(
            "Cannot finish simulation: "
            f"{total_answered}/{attempt.total_questions} scenarios answered"
        )

    correct_count = AttemptAnswer.query.filter_by(
        attempt_id=attempt_id, is_correct=True
    ).count()
    percentage = round((correct_count / attempt.total_questions) * 100, 2)

    attempt.score = correct_count
    attempt.percentage = percentage
    attempt.awareness_level = calculate_awareness_level(percentage)
    attempt.finished_at = datetime.utcnow()
    attempt.status = SimulationAttempt.STATUS_COMPLETED

    result = Result(user_id=attempt.user_id, score=correct_count)
    db.session.add(result)

    db.session.commit()
    return attempt, result
