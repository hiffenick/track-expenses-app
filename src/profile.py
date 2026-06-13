import random,pyotp
from flask_login import current_user, login_required, logout_user 
from flask import (
    Blueprint,
    render_template,
    flash,
    redirect,
    url_for,
    request,
    session,
    jsonify
)

from flask_login import current_user, login_required
from flask_mail import Message
from src.extensions import bcrypt,db, mail,limiter
from src.wtform import EmailOTPForm, ChangePasswordForm ,DeleteAccountForm


profile_route = Blueprint('profile', __name__)


# ================================
# PROFILE PAGE (GET)
# ================================
@profile_route.route('/profile-settings', methods=['GET'])
@login_required
@limiter.limit("60 per minute")
def profile():
    otp_form = EmailOTPForm()
    password_form = ChangePasswordForm()
    delete_form = DeleteAccountForm()

    return render_template(
        'profile.html',
        current_user=current_user,
        otp_form=otp_form,
        password_form=password_form,
        delete_form = delete_form,
        user=current_user.user_name
    )


# ================================
# UPDATE PROFILE (POST)
# ================================
@profile_route.route('/profile-settings', methods=['POST'])
@login_required
@limiter.limit("20 per minute")
def update_profile():
    try:
        username = request.form.get('username')

        if username:
            current_user.user_name = username.strip()
            db.session.commit()

            flash('Profile updated successfully.', 'success')

    except Exception as e:
        db.session.rollback()
        print("PROFILE UPDATE ERROR:", e)

        flash('Something went wrong.', 'error')

    return redirect(url_for('profile.profile'))


# ================================
# SEND PASSWORD OTP (AJAX FIXED)
# ================================
# @profile_route.route('/send-password-otp', methods=['POST'])
# @login_required
# @limiter.limit("5 per minute")       # sends email — strict
# @limiter.limit("10 per hour")
# def send_password_otp():

#     try:
#         otp = str(random.randint(100000, 999999))

#         # store OTP in session
#         session['password_change_otp'] = otp
#         session['password_otp_verified'] = False
#         session['otp_purpose'] = 'change_password'

#         print("OTP GENERATED:", otp)
#         print("SENDING TO:", current_user.user_mail)

#         msg = Message(
#             subject='Expenso Password Verification',
#             recipients=[current_user.user_mail]
#         )

#         msg.body = f"""
# Your Expenso verification code is:

# {otp}

# This OTP will expire soon.
# If this wasn't you, please secure your account.
# """

#         mail.send(msg)

#         print("MAIL SENT SUCCESSFULLY")

#         return jsonify({
#             "success": True,
#             "message": "OTP sent successfully"
#         }), 200

#     except Exception as e:
#         print("MAIL ERROR:", e)

#         return jsonify({
#             "success": False,
#             "message": "Failed to send OTP"
#         }), 500



# ================================
# VERIFY OTP
# ================================
@profile_route.route('/verify-password-otp', methods=['POST'])
@login_required
@limiter.limit("5 per minute")       # OTP brute force protection
@limiter.limit("10 per hour")
def verify_password_otp():

    entered_otp = request.form.get('otp')
    csrf_token = request.form.get('csrf_token')

    print("ENTERED OTP:", entered_otp)
    print("SESSION OTP:", session.get('password_change_otp'))

    if not csrf_token:
        return jsonify({
            "success": False,
            "message": "CSRF token missing"
        }), 400

    if not entered_otp:
        return jsonify({
            "success": False,
            "message": "OTP required"
        }), 400

    if len(entered_otp) != 6 or not entered_otp.isdigit():
        return jsonify({
            "success": False,
            "message": "Invalid OTP format"
        }), 400

    if not current_user.totp_secret:
        return jsonify({"success": False, "message": "Authenticator not set up"}), 400

    totp = pyotp.TOTP(current_user.totp_secret)

    if not totp.verify(entered_otp, valid_window=1):
        return jsonify({"success": False, "message": "Incorrect OTP"}), 400

    session['password_otp_verified'] = True

    return jsonify({
        "success": True,
        "message": "OTP verified successfully",
        "purpose": session.get('otp_purpose', 'change_password')
    }), 200



# ================================
# CHANGE PASSWORD
# ================================
@profile_route.route('/change-password', methods=['POST'])
@login_required
@limiter.limit("5 per minute")
@limiter.limit("10 per hour")
def change_password():

    password_form = ChangePasswordForm()

    if not password_form.validate_on_submit():
        flash('Please check your inputs.', 'error')
        return redirect(url_for('profile.profile'))

    # OTP CHECK
    if not session.get('password_otp_verified'):
        flash('OTP verification required.', 'error')
        return redirect(url_for('profile.profile'))

    current_password = request.form.get('current_password')
    new_password = request.form.get('new_password')

    # verify current password
    if not bcrypt.check_password_hash(current_user.user_pass, current_password):
        flash('Current password is incorrect.', 'error')
        return redirect(url_for('profile.profile'))

    try:
        current_user.user_pass = bcrypt.generate_password_hash(new_password)
        db.session.commit()

        # cleanup session
        session.pop('password_otp_verified', None)

        flash('Password changed successfully.Please Login Again', 'success')
        logout_user()
        return redirect(url_for('auth.login'))

    except Exception as e:
        db.session.rollback()
        print("PASSWORD CHANGE ERROR:", e)

        flash('Something went wrong.', 'error')

    return redirect(url_for('profile.profile'))



# replace with
@profile_route.route('/send-delete-otp', methods=['POST'])
@login_required
@limiter.limit("3 per minute")
@limiter.limit("5 per hour")
def send_delete_otp():

    password = request.form.get('password')

    if not bcrypt.check_password_hash(current_user.user_pass, password):
        return jsonify({
            "success": False,
            "message": "Incorrect password"
        }), 400

    if not current_user.totp_secret:
        return jsonify({
            "success": False,
            "message": "Authenticator not set up"
        }), 400

    session['password_otp_verified'] = False
    session['otp_purpose'] = 'delete_account'

    return jsonify({
        "success": True,
        "message": "Password verified"
    }), 200



@profile_route.route('/delete-account', methods=['POST'])
@login_required
@limiter.limit("3 per minute")       # strictest — irreversible action
@limiter.limit("5 per hour")
def delete_account():
    from flask_wtf.csrf import validate_csrf
    from wtforms import ValidationError

    try:
        validate_csrf(request.form.get('csrf_token'))
    except ValidationError:
        return jsonify({"success": False, "message": "CSRF validation failed"}), 400

    if not session.get('password_otp_verified') or session.get('otp_purpose') != 'delete_account':
        return jsonify({"success": False, "message": "OTP verification required"}), 400

    try:
        user = current_user._get_current_object()
        logout_user()

        db.session.delete(user)
        db.session.commit()

        session.clear()

        return jsonify({"success": True, "redirect": url_for('home.home')}), 200

    except Exception as e:
        db.session.rollback()
        print("DELETE ACCOUNT ERROR:", e)
        return jsonify({"success": False, "message": "Something went wrong"}), 500
