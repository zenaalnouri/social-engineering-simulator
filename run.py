"""
Entry point.

    flask db init            # first time only
    flask db migrate -m "initial schema"
    flask db upgrade
    python run.py             # or: flask run

Swagger UI: http://localhost:5000/docs
"""

import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", 5000)),
        debug=app.config.get("DEBUG", False),
    )
