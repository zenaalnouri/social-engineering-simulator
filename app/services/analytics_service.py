"""Scenario and platform-wide analytics."""

from app.extensions import db
from app.models import AttemptAnswer, Scenario


def get_overall_analytics():
    """Platform-wide totals across every scenario."""
    scenarios = Scenario.query.all()
    total_correct = AttemptAnswer.query.filter_by(is_correct=True).count()
    total_incorrect = AttemptAnswer.query.filter_by(is_correct=False).count()
    total_attempts = total_correct + total_incorrect

    return {
        "total_scenarios": len(scenarios),
        "active_scenarios": sum(1 for s in scenarios if s.is_active),
        "total_attempts": total_attempts,
        "total_correct_answers": total_correct,
        "total_incorrect_answers": total_incorrect,
        "overall_success_rate": (
            round((total_correct / total_attempts) *
                  100, 2) if total_attempts else 0.0
        ),
        "overall_failure_rate": (
            round((total_incorrect / total_attempts)
                  * 100, 2) if total_attempts else 0.0
        ),
    }


def get_scenario_analytics():
    """
    Per-scenario stats, plus callouts for most/least attempted and
    most failed/successful scenarios (based on raw counts).
    """
    scenarios = Scenario.query.all()
    counts = {}
    for scenario in scenarios:
        correct = AttemptAnswer.query.filter_by(
            scenario_id=scenario.id, is_correct=True
        ).count()
        incorrect = AttemptAnswer.query.filter_by(
            scenario_id=scenario.id, is_correct=False
        ).count()
        counts[scenario.id] = {
            "total": correct + incorrect,
            "correct": correct,
            "incorrect": incorrect,
        }

    most_attempted = max(
        scenarios, key=lambda s: counts[s.id]["total"], default=None)
    least_attempted = min(
        scenarios, key=lambda s: counts[s.id]["total"], default=None)
    attempted = [s for s in scenarios if counts[s.id]["total"] > 0]
    most_failed = max(
        attempted, key=lambda s: counts[s.id]["incorrect"], default=None)
    most_successful = max(
        attempted, key=lambda s: counts[s.id]["correct"], default=None)

    def scenario_data(s):
        if not s:
            return None
        data = s.to_dict(include_stats=False)
        stats = counts[s.id]
        data.update(
            {
                "total_attempts": stats["total"],
                "correct_answers": stats["correct"],
                "incorrect_answers": stats["incorrect"],
                "success_rate": round(stats["correct"] / stats["total"] * 100, 2)
                if stats["total"] else 0.0,
                "failure_rate": round(stats["incorrect"] / stats["total"] * 100, 2)
                if stats["total"] else 0.0,
            }
        )
        return data

    return {
        "scenarios": [scenario_data(s) for s in scenarios],
        "most_attempted_scenario": scenario_data(most_attempted),
        "least_attempted_scenario": scenario_data(least_attempted),
        "most_failed_scenario": scenario_data(most_failed),
        "most_successful_scenario": scenario_data(most_successful),
    }
