"""Public leaderboard logic."""

from app.models import Result


def get_leaderboard(limit=50):
    """
    Return completed attempts sorted by highest score first, then by
    most recently finished for ties.
    """
    results = (
        Result.query
        .order_by(Result.score.desc(), Result.date.desc())
        .limit(limit)
        .all()
    )

    return [result.to_dict() for result in results]
