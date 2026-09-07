"""Public saved-result history."""

from flask_restx import Namespace, Resource

from app.models import Result, User
from app.utils.exceptions import NotFoundError
from app.utils.responses import success_response

ns = Namespace("results", description="Saved simulation results")


@ns.route("/<int:user_id>")
class UserResultsResource(Resource):
    def get(self, user_id):
        if not User.query.get(user_id):
            raise NotFoundError("User not found")
        results = (
            Result.query.filter_by(user_id=user_id)
            .order_by(Result.date.desc())
            .all()
        )
        return success_response(
            data=[result.to_dict() for result in results],
            message="Results retrieved",
        )
