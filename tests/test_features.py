import unittest

from app import create_app
from app.models import Result, ScamAlert, User


class FeatureTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()

    def test_admin_requires_login(self):
        response = self.client.get("/admin/dashboard")
        self.assertEqual(response.status_code, 401)

    def test_alerts_are_bilingual(self):
        arabic = self.client.get("/alerts?lang=ar").get_json()["data"]
        english = self.client.get("/alerts?lang=en").get_json()["data"]
        with self.app.app_context():
            alert_count = ScamAlert.query.count()
        self.assertEqual(len(arabic), alert_count)
        self.assertEqual(len(english), len(arabic))
        self.assertEqual(
            [item["id"] for item in arabic],
            [item["id"] for item in english],
        )

    def test_admin_accounts_exist(self):
        names = {"zena", "soulaf", "lara", "bayan", "dr"}
        with self.app.app_context():
            users = {
                user.username
                for user in User.query.filter(User.username.in_(names)).all()
            }
        self.assertEqual(users, names)

    def test_dashboard_separates_regular_and_admin_users(self):
        with self.client.session_transaction() as session:
            session["admin_username"] = "zena"
        dashboard = self.client.get("/admin/dashboard").get_json()["data"]
        self.assertEqual(dashboard["admin_users"], 5)
        self.assertEqual(dashboard["users"], 0)

    def test_result_table_is_available(self):
        with self.app.app_context():
            self.assertEqual(Result.query.count(), 0)


if __name__ == "__main__":
    unittest.main()
