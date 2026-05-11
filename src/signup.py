from flask import Blueprint,render_template,redirect,url_for,request
from flask_login import current_user
from werkzeug.security import generate_password_hash
from src.models.user import User
from src.extensions import db
from src.wtform import Signup
from src.extensions import bcrypt

signup_route = Blueprint('signup',__name__)

@signup_route.route('/signup',methods=['GET','POST'])
def signup():
    form = Signup()
    if request.method == 'POST' and form.validate_on_submit():
        email = form.email.data
        name = form.username.data
        phone = form.phonenumber.data
        password = form.password.data

        user = User.query.filter_by(user_mail = email).first()

        if user:
            return redirect(url_for('login.login'))
        else:
            newuser = User(
                user_mail = email,
                user_name = name,
                user_phone = phone,
                user_pass = bcrypt.generate_password_hash(password).decode('utf-8')
            )
            try :
                db.session.add(newuser)
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                print(f'Error{e}')
            return redirect(url_for('login.login'))
    return render_template('signup.html',form = form)