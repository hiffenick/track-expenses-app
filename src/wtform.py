from flask_wtf import FlaskForm
from wtforms import StringField,SubmitField,EmailField,FileField,PasswordField,TelField,IntegerField,DateField,SelectField,BooleanField
from wtforms.validators import Email,DataRequired,Regexp,Length,Optional,EqualTo
from wtforms import StringField, FloatField, DateField, TextAreaField
# from flask_wtf.file import FileAllowed
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


class ProfileForm(FlaskForm):
    username = StringField('Username',validators=[DataRequired(),Length(min=3, max=30)])
    email = EmailField('Email',validators=[DataRequired(),Email()])
    # avatar = FileField('Profile Photo',validators=[FileAllowed(['jpg', 'jpeg', 'png', 'gif'],'Images only!')])
    submit = SubmitField('Save Changes')


# =========================
# EMAIL OTP FORM
# =========================

class EmailOTPForm(FlaskForm):

    otp = StringField(

        'OTP',

        validators=[

            DataRequired(
                message='OTP is required.'
            ),

            Length(
                min=6,
                max=6,
                message='OTP must be 6 digits.'
            )

        ]

    )

    submit = SubmitField(
        'Verify Code'
    )


# =========================
# CHANGE PASSWORD FORM
# =========================

class ChangePasswordForm(FlaskForm):

    current_password = PasswordField(

        'Current Password',

        validators=[

            DataRequired(
                message='Current password is required.'
            )

        ]

    )

    new_password = PasswordField(

        'New Password',

        validators=[

            DataRequired(
                message='New password is required.'
            ),

            Length(
                min=8,
                max=64,
                message='Password must be at least 8 characters.'
            )

        ]

    )

    confirm_password = PasswordField(

        'Confirm Password',

        validators=[

            DataRequired(
                message='Please confirm your password.'
            ),

            EqualTo(
                'new_password',
                message='Passwords must match.'
            )

        ]

    )

    submit = SubmitField(
        'Change Password'
    )

class DeleteAccountForm(FlaskForm):
    password = PasswordField(
        'Current Password',
        validators=[DataRequired()]
    )

    submit = SubmitField('Verify')