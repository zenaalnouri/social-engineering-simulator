"""GET /reports -- dashboard statistics."""

from flask_restx import Namespace, Resource

from app.services.report_service import get_dashboard_report
from app.utils.responses import success_response

ns = Namespace("reports", description="Dashboard statistics and reports")


@ns.route("")
class ReportsResource(Resource):
    @ns.response(200, "Report generated")
    def get(self):
        """Get dashboard statistics: users, completed simulations, scores, scenario performance."""
        data = get_dashboard_report()
        return success_response(data=data, message="Report generated")
