"""Application exceptions and JSON error handlers."""


class AppError(Exception):

    """Base class for all handled application errors."""

    status_code = 400

    def __init__(self, message, status_code=None, error=None):
        super().__init__(message)
        self.message = message
        self.error = error or {}
        if status_code is not None:
            self.status_code = status_code


class ValidationError(AppError):

    """Invalid or incomplete request data."""

    status_code = 400


class NotFoundError(AppError):

    """Requested resource does not exist."""

    status_code = 404


class ConflictError(AppError):

    """Request conflicts with the current resource state."""

    status_code = 409


def _error_body(err):
    return {
        "success": False,
        "message": err.message,
        "error": err.error,
    }


def register_error_handlers(api):
    """Register handlers on the Flask-RESTX API."""

    @api.errorhandler(ValidationError)
    def handle_validation_error(err):
        return _error_body(err), err.status_code

    @api.errorhandler(NotFoundError)
    def handle_not_found_error(err):
        return _error_body(err), err.status_code

    @api.errorhandler(ConflictError)
    def handle_conflict_error(err):
        return _error_body(err), err.status_code

    @api.errorhandler(AppError)
    def handle_app_error(err):
        return _error_body(err), err.status_code

    @api.errorhandler
    def handle_generic_error(err):
        """Catch-all for anything unexpected, so we never leak a raw traceback."""
        return {
            "success": False,
            "message": "Internal server error",
            "error": {"detail": str(err)},
        }, 500
