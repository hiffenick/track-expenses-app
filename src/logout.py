from flask import render_template,Blueprint,redirect,url_for,flash
from flask_login import login_required,logout_user


logout_route = Blueprint('logout',__name__)

@login_required
@logout_route.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('home.home'))