import random
from flask import Blueprint,render_template,request,redirect,url_for,session
from flask_mail import Message
from src.extensions import loginmanager
from flask_login import login_user,current_user
from werkzeug.security import check_password_hash
from src.extensions import bcrypt
from src.models.user import User
from src.wtform import LoginForm

login_route = Blueprint('login',__name__)

@loginmanager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@login_route.route('/login',methods=['GET','POST'])
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
            session['otp-verified'] = False

            #Send Otp Main
            msg = Message('Your OTP Code' , recipients=[user.user_mail])
            msg.body = f'Your OTP for ExpenseInsight Login is : {otp}'
            from src.extensions import mail
            mail.send(msg)
            print('mail sent')
            return redirect(url_for('verify.verify'))

    return render_template('login.html',form = form)

# @login_route.route('/login', methods=['GET', 'POST'])
# def login():
#     if current_user.is_authenticated:
#         print("Already logged in")
#         return redirect(url_for('dashboard.dashboard'))
    
#     form = LoginForm()

#     if request.method == 'POST':
#         print("Form submitted")
#         if form.validate_on_submit():
#             print("Form validated")
#             user = User.query.filter_by(user_mail=form.email.data).first()
#             print(f"User found: {user}")
#             if user:
#                 print(f"Checking password for: {user.user_mail}")
#                 print(f"Stored hash: {user.user_pass}")
#                 print(f"Entered password: {form.password.data}")
#                 if bcrypt.check_password_hash(user.user_pass, form.password.data):
#                     print("Login success!")
#                     login_user(user, remember=True)
#                     return redirect(url_for('dashboard.dashboard'))
#                 else:
#                     print("Password mismatch")
#             else:
#                 print("No user found with that email")
#         else:
#             print("Form validation failed")
#             print(form.errors)

#     return render_template('login.html', form=form)
