from src.extensions import db

class expenses(db.Model):
    __tablename__ = 'expenses'

    expense_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    expense_amount = db.Column(db.Integer, nullable=False)

    expense_title = db.Column(db.String(255), nullable=False, default="Untitled")

    expense_date = db.Column(db.Date, nullable=False)
    expense_note = db.Column(db.String(255), nullable=False)

    user_id = db.Column(db.Integer, db.ForeignKey('User.user_id'), nullable=False)
    author = db.relationship('User', back_populates='expenses')

    # 🔥 NEW RELATION (IMPORTANT)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.category_id'), nullable=False)
    category = db.relationship('Category', back_populates='expenses')
    