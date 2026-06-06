import random
import resend
import os
from flask import Blueprint, render_template, request, redirect, url_for, session
from src.extensions import loginmanager
from flask_login import login_user, current_user
from src.extensions import bcrypt, limiter
from src.models.user import User
from src.wtform import LoginForm

resend.api_key = os.getenv("RESEND_API_KEY")

login_route = Blueprint('login', __name__)

@loginmanager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@login_route.route('/login', methods=['GET', 'POST'])
@limiter.limit("10 per minute")
@limiter.limit("20 per hour")
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.dashboard'))
    
    form = LoginForm()

    if request.method == 'POST' and form.validate_on_submit():
        user = User.query.filter_by(user_mail=form.email.data).first()
        if user and bcrypt.check_password_hash(user.user_pass, form.password.data):
            otp = str(random.randint(100000, 999999))
            session['user_id'] = user.user_id
            session['otp'] = otp
            session['otp_verified'] = False

            resend.Emails.send({
                "from": "onboarding@resend.dev",
                "to": user.user_mail,
                "subject": "Your Expense Tracker OTP",
                "text": f"Hello {user.user_name},\n\nYour OTP is: {otp}\n\nDo not share this OTP with anyone.\n\n- Expense Tracker"
            })

            return redirect(url_for('verify.verify'))

    return render_template('login.html', form=form)