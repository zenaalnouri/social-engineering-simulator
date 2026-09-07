"""
SQLAlchemy models for the Social Engineering Simulator.

Core models follow the spec directly: User, Scenario, Question,
SimulationAttempt, AttemptAnswer.

One internal helper model is added beyond the spec: AttemptScenario.
It records which 5 scenarios/questions were randomly assigned to a
given attempt at /simulation/start time, *before* they are answered.
Without it there would be no way to validate that a submitted answer
belongs to the attempt, or to detect a duplicate submission, until
after the fact -- both of which are explicit validation requirements.
"""

from datetime import datetime

from app.extensions import db


class User(db.Model):
    __tablename__ = "Users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True,
                         nullable=False, index=True)
    password = db.Column(db.String(255), nullable=True)

    @property
    def name(self):
        return self.username

    @name.setter
    def name(self, value):
        self.username = value

    @property
    def created_at(self):
        return None

    attempts = db.relationship(
        "SimulationAttempt", backref="user", lazy=True, cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Result(db.Model):
    """Persistent score record stored in the supplied Results table."""

    __tablename__ = "Results"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    date = db.Column(db.DateTime, server_default=db.func.current_timestamp())

    user = db.relationship("User", backref="results")

    def to_dict(self, total_questions=5):
        percentage = round((self.score / total_questions) * 100, 2)
        if percentage >= 80:
            awareness_level = "High"
        elif percentage >= 60:
            awareness_level = "Medium"
        else:
            awareness_level = "Low"
        return {
            "id": self.id,
            "result_id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else None,
            "score": self.score,
            "total_questions": total_questions,
            "correct_answers": self.score,
            "incorrect_answers": total_questions - self.score,
            "percentage": percentage,
            "awareness_level": awareness_level,
            "date": self.date.isoformat() if self.date else None,
        }


class ScamAlert(db.Model):
    """Bilingual scam alert from the supplied ScamAlerts table."""

    __tablename__ = "ScamAlerts"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=False)
    title_en = db.Column(db.Text, nullable=False)
    description_en = db.Column(db.Text, nullable=False)

    def to_dict(self, language="ar"):
        is_english = language == "en"
        return {
            "id": self.id,
            "title": self.title_en if is_english else self.title,
            "description": self.description_en if is_english else self.description,
        }


class Scenario(db.Model):
    __tablename__ = "Scenarios"

    VALID_TYPES = (
        "phishing_email",
        "fake_login_page",
        "fake_it_support_chat",
        "sms_scam",
        "giveaway_scam",
        "fake_manager_message",
    )
    VALID_DIFFICULTIES = ("easy", "medium", "hard")

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    option1 = db.Column(db.Text, nullable=False)
    option2 = db.Column(db.Text, nullable=False)
    option3 = db.Column(db.Text, nullable=False)
    option4 = db.Column(db.Text, nullable=False)
    correct_answer = db.Column(db.String(20), nullable=False)
    explanation = db.Column(db.Text, nullable=False)
    warning_indicators = db.Column(db.Text, nullable=True)
    title_en = db.Column(db.String(200), nullable=True)
    category_en = db.Column(db.String(100), nullable=True)
    description_en = db.Column(db.Text, nullable=True)
    option1_en = db.Column(db.Text, nullable=True)
    option2_en = db.Column(db.Text, nullable=True)
    option3_en = db.Column(db.Text, nullable=True)
    option4_en = db.Column(db.Text, nullable=True)
    explanation_en = db.Column(db.Text, nullable=True)
    warning_indicators_en = db.Column(db.Text, nullable=True)

    type = property(lambda self: self.category, lambda self,
                    value: setattr(self, "category", value))
    content = property(lambda self: self.description, lambda self,
                       value: setattr(self, "description", value))
    difficulty = property(lambda self: "medium", lambda self, value: None)
    is_active = property(lambda self: True, lambda self, value: None)
    total_attempts = property(lambda self: 0, lambda self, value: None)
    correct_answers = property(lambda self: 0, lambda self, value: None)
    incorrect_answers = property(lambda self: 0, lambda self, value: None)

    questions = db.relationship(
        "Question", backref="scenario", lazy=True, cascade="all, delete-orphan"
    )

    @property
    def success_rate(self):
        if self.total_attempts == 0:
            return 0.0
        return round((self.correct_answers / self.total_attempts) * 100, 2)

    @property
    def failure_rate(self):
        if self.total_attempts == 0:
            return 0.0
        return round((self.incorrect_answers / self.total_attempts) * 100, 2)

    def to_dict(self, include_stats=True, include_answer=False, language="ar"):
        is_english = language == "en"
        title = self.title_en if is_english and self.title_en else self.title
        category = self.category_en if is_english and self.category_en else self.category
        description = (
            self.description_en if is_english and self.description_en else self.description
        )
        data = {
            "id": self.id,
            "title": title,
            "type": category,
            "description": description,
            "content": description,
            "difficulty": self.difficulty,
            "is_active": self.is_active,
            "options": {
                "A": self.option1_en if is_english and self.option1_en else self.option1,
                "B": self.option2_en if is_english and self.option2_en else self.option2,
                "C": self.option3_en if is_english and self.option3_en else self.option3,
                "D": self.option4_en if is_english and self.option4_en else self.option4,
            },
        }
        if include_answer:
            data["explanation"] = (
                self.explanation_en if is_english and self.explanation_en else self.explanation
            )
        if include_stats:
            data.update(
                {
                    "total_attempts": self.total_attempts,
                    "correct_answers": self.correct_answers,
                    "incorrect_answers": self.incorrect_answers,
                    "success_rate": self.success_rate,
                    "failure_rate": self.failure_rate,
                }
            )
        return data


class Question(db.Model):
    __tablename__ = "questions"

    id = db.Column(db.Integer, primary_key=True)
    scenario_id = db.Column(db.Integer, db.ForeignKey(
        "Scenarios.id"), nullable=False)

    question = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.String(255), nullable=False)
    option_b = db.Column(db.String(255), nullable=False)
    option_c = db.Column(db.String(255), nullable=False)
    option_d = db.Column(db.String(255), nullable=True)
    correct_answer = db.Column(
        db.String(1), nullable=False)  # 'A', 'B', or 'C'

    created_at = db.Column(
        db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self, include_answer=False):
        data = {
            "id": self.id,
            "scenario_id": self.scenario_id,
            "question": self.question,
            "option_a": self.option_a,
            "option_b": self.option_b,
            "option_c": self.option_c,
            "option_d": self.option_d,
        }
        if include_answer:
            data["correct_answer"] = self.correct_answer
        return data


class SimulationAttempt(db.Model):
    __tablename__ = "simulation_attempts"

    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)

    started_at = db.Column(
        db.DateTime, default=datetime.utcnow, nullable=False)
    finished_at = db.Column(db.DateTime, nullable=True)

    status = db.Column(db.String(20), nullable=False,
                       default=STATUS_IN_PROGRESS)
    total_questions = db.Column(db.Integer, nullable=False, default=5)

    score = db.Column(db.Integer, nullable=True)
    percentage = db.Column(db.Float, nullable=True)
    awareness_level = db.Column(db.String(30), nullable=True)

    scenario_links = db.relationship(
        "AttemptScenario", backref="attempt", lazy=True, cascade="all, delete-orphan"
    )
    answers = db.relationship(
        "AttemptAnswer", backref="attempt", lazy=True, cascade="all, delete-orphan"
    )

    def to_dict(self, include_user=False):
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "status": self.status,
            "total_questions": self.total_questions,
            "score": self.score,
            "percentage": self.percentage,
            "awareness_level": self.awareness_level,
        }
        if include_user and self.user:
            data["user_name"] = self.user.name
        return data


class AttemptScenario(db.Model):
    """
    Internal mapping of which scenarios/questions were randomly assigned
    to a simulation attempt at start time. Not part of the original spec
    fields, but required to validate /simulation/answer submissions
    (scenario belongs to attempt, no duplicate submission) before an
    AttemptAnswer row exists.
    """

    __tablename__ = "attempt_scenarios"

    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(
        db.Integer, db.ForeignKey("simulation_attempts.id"), nullable=False
    )
    scenario_id = db.Column(db.Integer, db.ForeignKey(
        "Scenarios.id"), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey(
        "questions.id"), nullable=True)
    order_index = db.Column(db.Integer, nullable=False, default=0)

    scenario = db.relationship("Scenario")
    question = db.relationship("Question")

    __table_args__ = (
        db.UniqueConstraint("attempt_id", "scenario_id",
                            name="uq_attempt_scenario"),
    )


class AttemptAnswer(db.Model):
    __tablename__ = "attempt_answers"

    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(
        db.Integer, db.ForeignKey("simulation_attempts.id"), nullable=False
    )
    scenario_id = db.Column(db.Integer, db.ForeignKey(
        "Scenarios.id"), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey(
        "questions.id"), nullable=True)

    selected_answer = db.Column(db.String(1), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False)

    answered_at = db.Column(
        db.DateTime, default=datetime.utcnow, nullable=False)

    scenario = db.relationship("Scenario")

    __table_args__ = (
        db.UniqueConstraint("attempt_id", "scenario_id",
                            name="uq_attempt_answer"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "attempt_id": self.attempt_id,
            "scenario_id": self.scenario_id,
            "question_id": self.question_id,
            "selected_answer": self.selected_answer,
            "is_correct": self.is_correct,
            "answered_at": self.answered_at.isoformat() if self.answered_at else None,
        }
