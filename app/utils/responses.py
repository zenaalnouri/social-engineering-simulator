"""
Standardized JSON response helpers.

Every endpoint in this API responds using one of these two envelopes:

Success:
    {
        "success": true,
        "message": "...",
        "data": {}
    }

Error:
    {
        "success": false,
        "message": "...",
        "error": {}
    }
"""


def success_response(data=None, message="Success", status_code=200):
    """Build a standardized success JSON response."""
    body = {
        "success": True,
        "message": message,
        "data": data if data is not None else {},
    }
    return body, status_code


def error_response(message="An error occurred", error=None, status_code=400):
    """Build a standardized error JSON response."""
    body = {
        "success": False,
        "message": message,
        "error": error if error is not None else {},
    }
    return body, status_code
