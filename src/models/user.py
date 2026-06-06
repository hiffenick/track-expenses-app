from src.extensions import db
from flask_login import UserMixin

class User(db.Model, UserMixin):
    __tablename__ = 'User'
    user_id = db.Column(db.Integer, nullable=False, primary_key=True, autoincrement=True)
    user_mail = db.Column(db.String(255), nullable=False)
    user_name = db.Column(db.String(255), nullable=False)
    user_phone = db.Column(db.String(255), nullable=False)
    user_pass = db.Column(db.String(255), nullable=False)
    totp_secret = db.Column(db.String(32), nullable=True)
    expenses = db.relationship('expenses', back_populates='author')

    def get_id(self):
        return str(self.user_id)