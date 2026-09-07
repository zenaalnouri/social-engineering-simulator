"""Dashboard reporting: platform-wide statistics for /reports."""

from app.extensions import db
from app.config import ADMIN_NAMES
from app.models import Result, User
from app.services.analytics_service import get_scenario_analytics


def get_dashboard_report():
    total_users = User.query.filter(~User.username.in_(ADMIN_NAMES)).count()
    total_completed = Result.query.count()

    scores = [result.score for result in Result.query.all()]
    avg_score = sum(scores) / len(scores) if scores else 0
    avg_percentage = (avg_score / 5) * 100
    highest_score = max(scores, default=0)
    lowest_score = min(scores, default=0)

    scenario_analytics = get_scenario_analytics()

    return {
        "total_users": total_users,
        "total_completed_simulations": total_completed,
        "average_score": round(avg_score, 2),
        "average_percentage": round(avg_percentage, 2),
        "highest_score": highest_score,
        "lowest_score": lowest_score,
        "most_failed_scenario": scenario_analytics["most_failed_scenario"],
        "most_successful_scenario": scenario_analytics["most_successful_scenario"],
        "scenario_success_failure_rates": [
            {
                "scenario_id": s["id"],
                "title": s["title"],
                "success_rate": s["success_rate"],
                "failure_rate": s["failure_rate"],
            }
            for s in scenario_analytics["scenarios"]
        ],
    }
