"""User lookup / registration logic."""

from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import User
from app.utils.exceptions import ConflictError
from app.utils.validators import validate_non_empty_string


def get_or_create_user(name):
    """
    Register a user by name.

    Usernames are treated case-insensitively at the application level.
    If the username is already registered, reject the registration instead
    of returning the existing account. The database uniqueness constraint
    remains the final protection against duplicate rows in concurrent
    requests.

    Returns ``(user, created)`` for a successful registration.
    """

    name = validate_non_empty_string(name, "name")

    existing = User.query.filter(
        db.func.lower(User.username) == name.lower()
    ).first()
    if existing:
        raise ConflictError("Username already taken")

    user = User(name=name, password="")
    db.session.add(user)

    try:
        db.session.commit()
    except IntegrityError:
        # The pre-check above handles the normal case. This rollback also
        # handles a race where another request creates the same username
        # between our SELECT and INSERT.
        db.session.rollback()
        raise ConflictError("Username already taken")

    return user, True
