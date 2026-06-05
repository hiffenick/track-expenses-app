from flask import render_template,Blueprint,redirect,url_for,flash,session
from flask_login import login_required,logout_user


logout_route = Blueprint('logout',__name__)


@logout_route.route('/logout')
@login_required
def logout():
    session.clear()
    logout_user()
    return redirect(url_for('home.home'))