from src.extensions import db

class Category(db.Model):
    __tablename__ = 'categories'

    category_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    icon = db.Column(db.Unicode(20), nullable=True)

    # if you want user-defined categories
    user_id = db.Column(db.Integer, db.ForeignKey('User.user_id'), nullable=True)

    is_default = db.Column(db.Boolean, default=True)

    expenses = db.relationship('expenses', back_populates='category')