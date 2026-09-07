"""
Reusable request validation helpers.

Every function here either returns a cleaned value or raises a
ValidationError. Keeping validation in one place avoids duplicating
the same checks across routes and services.
"""

from app.utils.exceptions import ValidationError

VALID_ANSWER_CHOICES = ("A", "B", "C", "D")


def validate_non_empty_string(value, field_name):
    """Ensure a value is a non-blank string; return it stripped."""

    if value is None or not isinstance(value, str) or not value.strip():
        raise ValidationError(
            f"'{field_name}' is required and cannot be empty")
    return value.strip()


def validate_answer_choice(value):
    """Ensure a submitted answer is one of A, B, C, or D."""

    if not isinstance(value, str) or value.strip().upper() not in VALID_ANSWER_CHOICES:
        raise ValidationError("'selected_answer' must be one of: A, B, C, D")
    return value.strip().upper()


def validate_positive_int(value, field_name):
    """Ensure a value is a positive (non-boolean) integer."""

    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValidationError(f"'{field_name}' must be a positive integer")
    return value
