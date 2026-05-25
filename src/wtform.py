from flask_wtf import FlaskForm
from wtforms import StringField,SubmitField,EmailField,PasswordField,TelField,IntegerField,DateField,SelectField,BooleanField
from wtforms.validators import Email,DataRequired,Regexp,Length,Optional
from wtforms import StringField, FloatField, DateField, TextAreaField
from wtforms.validators import DataRequired, NumberRange

class Signup(FlaskForm):
    email = EmailField('email',validators=[DataRequired(),Email()])
    username = StringField('username',validators=[DataRequired()])
    phonenumber = TelField('phone',validators=[DataRequired(),Regexp(r'^\d{10}',message='Enter 10 digits number')])
    password = PasswordField('password',validators=[DataRequired(),Length(min=8)])
    submit = SubmitField('Sign Up')

class LoginForm(FlaskForm):
    email = EmailField('email',validators=[DataRequired(),Email()])
    password = PasswordField('password',validators=[DataRequired(),Length(min=8)])
    submit = SubmitField('Log In')

class Verify(FlaskForm):
    otp = StringField('Enter Otp' , validators=[DataRequired(),Length(max=6)])
    submit = SubmitField('Verify')

class AddExpense(FlaskForm):
    amount = IntegerField('amount', validators=[DataRequired()])
    category = SelectField('category',choices = [
        ('Food','Food'),
        ('Transport','Transport'),
        ('Entertainment','Entertainment'),
        ('Bills' , 'Bills'),
        ('Other','Other')
    ],validators=[DataRequired()])
    date = DateField('date', format='%Y-%m-%d',validators=[DataRequired()])
    note = StringField('note',validators=[DataRequired(),Length(max=400)])


class ExpenseForm(FlaskForm):
    title = StringField(validators=[DataRequired()])
    amount = FloatField(validators=[DataRequired(), NumberRange(min=0.01)])
    category = StringField(validators=[DataRequired()])
    date = DateField(validators=[DataRequired()])
    note = TextAreaField()

class CategoryForm(FlaskForm):
    name     = StringField('Name', validators=[DataRequired(), Length(max=100)])
    icon     = StringField('Icon', validators=[Optional(), Length(max=10)])
    color    = StringField('Color', validators=[Optional(), Length(max=20)])
    monthly_budget = FloatField('Monthly Budget', validators=[Optional(), NumberRange(min=0)])
    rollover = BooleanField('Rollover', validators=[Optional()])
    submit   = SubmitField('Save')
