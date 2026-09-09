"""Public API for the alerts stored in the supplied database."""

import random
import time

from flask import request
from flask_restx import Namespace, Resource

from app.models import ScamAlert
from app.utils.responses import success_response

ns = Namespace("alerts", description="Database-backed scam alerts")


@ns.route("")
class AlertsResource(Resource):
    def get(self):
        language = request.args.get("lang", "en")
        if language not in ("ar", "en"):
            language = "en"
        alerts = ScamAlert.query.order_by(ScamAlert.id).all()
        rotation = int(time.time() // (2 * 60 * 60))
        random.Random(rotation).shuffle(alerts)
        return success_response(
            data=[alert.to_dict(language) for alert in alerts],
            message="Alerts retrieved",
        )
