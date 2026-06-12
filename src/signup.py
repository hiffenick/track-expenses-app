import pyotp
import qrcode
import io
import base64
from flask import Blueprint, render_template, redirect, url_for, request
from flask_login import current_user
from src.models.user import User
from src.extensions import db, bcrypt, limiter

signup_route = Blueprint('signup', __name__)

@signup_route.route('/signup', methods=['GET', 'POST'])
@limiter.limit("5 per minute")
@limiter.limit("20 per hour")
def signup():
    form = __import__('src.wtform', fromlist=['Signup']).Signup()

    if form.validate_on_submit():
        try:
            email = form.email.data
            name = form.username.data
            phone = form.phonenumber.data
            password = form.password.data

            user = User.query.filter_by(user_mail=email).first()
            if user:
                return redirect(url_for('login.login'))

            totp_secret = pyotp.random_base32()

            newuser = User(
                user_mail=email,
                user_name=name,
                user_phone=phone,
                user_pass=bcrypt.generate_password_hash(password).decode('utf-8'),
                totp_secret=totp_secret
            )

            db.session.add(newuser)
            db.session.commit()

            # Generate QR code
            totp_uri = pyotp.totp.TOTP(totp_secret).provisioning_uri(
                name=email,
                issuer_name="Xpenso"
            )
            img = qrcode.make(totp_uri)
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            qr_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')

            return render_template('setup_totp.html', qr_code=qr_base64, secret=totp_secret)

        except Exception as e:
            db.session.rollback()
            return f"Signup failed: {str(e)}", 500

    return render_template('signup.html', form=form)