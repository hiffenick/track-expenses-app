from flask import Blueprint,redirect,url_for,render_template,request,session,flash
from src.extensions import limiter
from flask_login import current_user,login_user
from datetime import datetime,timezone
from src.wtform import Verify
from src.models.user import User

verify_route = Blueprint('verify',__name__)


@verify_route.route('/verify-otp', methods=['GET', 'POST'])
@limiter.limit("10 per minute")
@limiter.limit("20 per hour")
def verify():
    if current_user.is_authenticated:
        return redirect(url_for('login.login'))
    form = Verify()
    if request.method == 'POST':
        user_id = session.get('user_id')
        user = User.query.get(user_id)
        entered_otp = form.otp.data
        if entered_otp == session.get('otp'):
            session['otp_verified'] = True
            login_user(user,remember=False)
            session.permanent = False 

            # Stamp session start time for idle timeout tracking
            session['_last_active'] = datetime.now(timezone.utc).timestamp()
            

            print('logged in')
            session.pop('otp')  # clear it
        
            return redirect(url_for('dashboard.dashboard'))
        else:
            flash('Incorrect OTP. Please try again.', 'danger')

    return render_template('verify.html',form = form)
