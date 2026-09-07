"""User lookup / registration logic."""

from app.extensions import db
from app.models import User
from app.utils.validators import validate_non_empty_string


def get_or_create_user(name):
    """
    Return (user, created) for the given name.

    If a user with this name (case-insensitive) already exists, it is
    returned as-is. Otherwise a new user is created.
    """

    name = validate_non_empty_string(name, "name")

    existing = User.query.filter(db.func.lower(
        User.username) == name.lower()).first()
    if existing:
        return existing, False

    user = User(name=name, password="")
    db.session.add(user)
    db.session.commit()
    return user, True
