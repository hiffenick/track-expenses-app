import random
from flask import Blueprint,render_template,request,redirect,url_for,session
from flask_mail import Message
from src.extensions import loginmanager,mail
from flask_login import login_user,current_user
from werkzeug.security import check_password_hash
from src.extensions import bcrypt,limiter
from src.models.user import User
from src.wtform import LoginForm

login_route = Blueprint('login',__name__)

@loginmanager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@login_route.route('/login',methods=['GET','POST'])
@limiter.limit("10 per minute")        # max 10 attempts per minute per IP
@limiter.limit("20 per hour")          # max 20 attempts per hour per IP
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.dashboard'))
    
    form = LoginForm()

    if request.method == 'POST' and form.validate_on_submit():

        user = User.query.filter_by(user_mail = form.email.data).first()
        if user and bcrypt.check_password_hash(user.user_pass , form.password.data):
            print('login sucess')

            #Genertae Otp for Authentification
            otp = str(random.randint(100000,999999))
            session['user_id'] = user.user_id
            session['otp'] = otp
            session['otp_verified'] = False

            #Send Otp Main
            msg = Message(
                subject="Your Expense Tracker OTP",
                recipients=[user.user_mail]
            )

            msg.body = f"""
            Hello {user.user_name},

            Your OTP is: {otp}

            Do not share this OTP with anyone.

            - Expense Tracker
            """

            mail.send(msg)

            # print("OTP SENT:", otp)
            return redirect(url_for('verify.verify'))

    return render_template('login.html',form = form)
