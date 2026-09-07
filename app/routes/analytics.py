"""GET /analytics, GET /analytics/scenarios."""

from flask_restx import Namespace, Resource

from app.services.analytics_service import get_overall_analytics, get_scenario_analytics
from app.utils.responses import success_response

ns = Namespace("analytics", description="Aggregate and per-scenario analytics")


@ns.route("")
class OverallAnalyticsResource(Resource):
    @ns.response(200, "Overall analytics retrieved")
    def get(self):
        """Get platform-wide analytics: totals, success rate, failure rate."""
        data = get_overall_analytics()
        return success_response(data=data, message="Analytics retrieved")


@ns.route("/scenarios")
class ScenarioAnalyticsResource(Resource):
    @ns.response(200, "Scenario analytics retrieved")
    def get(self):
        """Get per-scenario analytics, plus most/least attempted and most failed/successful."""
        data = get_scenario_analytics()
        return success_response(data=data, message="Scenario analytics retrieved")
