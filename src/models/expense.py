from src.extensions import db

class expenses(db.Model):
    __tablename__ = 'expenses'
    expense_id = db.Column(db.Integer,primary_key = True,autoincrement=True, nullable = False)
    expense_amount = db.Column(db.Integer , nullable = False)
    expense_category = db.Column(db.String(255) , nullable = False)
    expense_date = db.Column(db.Date, nullable = False)
    expense_note = db.Column(db.String(255) ,nullable = False)
    user_id = db.Column(db.Integer , db.ForeignKey('User.user_id'), nullable = False)
    author = db.relationship('User', back_populates = 'expenses')