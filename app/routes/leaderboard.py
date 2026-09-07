"""GET /leaderboard -- public leaderboard."""

from flask import request
from flask_restx import Namespace, Resource

from app.services.leaderboard_service import get_leaderboard
from app.utils.responses import success_response

ns = Namespace("leaderboard", description="Public leaderboard of completed simulations")


@ns.route("")
class LeaderboardResource(Resource):
    @ns.doc(params={"limit": "Maximum number of entries to return (default 50)"})
    @ns.response(200, "Leaderboard retrieved")
    def get(self):
        """Get the public leaderboard, sorted by highest score then most recently finished."""
        limit = request.args.get("limit", default=50, type=int)
        if not limit or limit <= 0:
            limit = 50
        entries = get_leaderboard(limit=limit)
        return success_response(data=entries, message="Leaderboard retrieved")
