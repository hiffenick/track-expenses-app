from flask import Blueprint, render_template, redirect, url_for, request
from flask_login import current_user
from src.models.user import User
from src.extensions import db, bcrypt
from src.wtform import Signup

signup_route = Blueprint('signup', __name__)

@signup_route.route('/signup', methods=['GET', 'POST'])
def signup():
    print("\n================ SIGNUP HIT ================")
    print("METHOD:", request.method)

    form = Signup()

    print("FORM CREATED")

    if request.method == "POST":
        print("🔥 POST REQUEST RECEIVED")

        print("FORM DATA RAW:", request.form)

    if form.validate_on_submit():
        print("✅ FORM VALIDATION PASSED")

        try:
            email = form.email.data
            name = form.username.data
            phone = form.phonenumber.data
            password = form.password.data

            print("EMAIL:", email)
            print("NAME:", name)
            print("PHONE:", phone)
            print("PASSWORD RECEIVED:", bool(password))

            # check existing user
            user = User.query.filter_by(user_mail=email).first()

            print("DB CHECK DONE - USER EXISTS:", bool(user))

            if user:
                print("⚠️ USER ALREADY EXISTS - REDIRECTING")
                return redirect(url_for('login.login'))

            print("🟡 CREATING NEW USER OBJECT")

            newuser = User(
                user_mail=email,
                user_name=name,
                user_phone=phone,
                user_pass=bcrypt.generate_password_hash(password).decode('utf-8')
            )

            print("🟢 ADDING TO SESSION")
            db.session.add(newuser)

            print("🟢 BEFORE COMMIT")

            db.session.commit()

            print("✅ COMMIT SUCCESS - USER SAVED")

            return redirect(url_for('login.login'))

        except Exception as e:
            db.session.rollback()

            print("❌ EXCEPTION OCCURRED:")
            print(str(e))

            return f"Signup failed: {str(e)}", 500

    else:
        print("❌ FORM VALIDATION FAILED")
        print("ERRORS:", form.errors)

    print("RETURNING SIGNUP PAGE")
    return render_template('signup.html', form=form)