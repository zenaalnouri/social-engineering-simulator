"""POST /users -- get-or-create a user by name."""

from flask import request
from flask_restx import Namespace, Resource, fields

from app.services.user_service import get_or_create_user
from app.utils.responses import success_response

ns = Namespace("users", description="User registration and lookup")

user_input_model = ns.model(
    "UserInput",
    {"name": fields.String(
        required=True, description="Display name of the user", example="Jane Doe")},
)

user_output_model = ns.model(
    "UserOutput",
    {
        "id": fields.Integer(description="User ID"),
        "name": fields.String(description="User name"),
        "created_at": fields.String(description="Creation timestamp (ISO 8601)"),
    },
)


@ns.route("")
class UserListResource(Resource):
    """Create or fetch a user by name."""

    @ns.expect(user_input_model)
    @ns.response(201, "User created", user_output_model)
    @ns.response(200, "Existing user returned", user_output_model)
    @ns.response(400, "Validation error")
    def post(self):
        """
        Register a user by name.

        If a user with this name already exists (case-insensitive),
        the existing user is returned instead of creating a duplicate.
        """

        payload = request.get_json(silent=True) or {}
        user, created = get_or_create_user(payload.get("name"))

        message = "User created successfully" if created else "Existing user returned"
        status_code = 201 if created else 200
        return success_response(data=user.to_dict(), message=message, status_code=status_code)
