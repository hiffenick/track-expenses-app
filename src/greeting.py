from flask import Blueprint,redirect,url_for,render_template,request,session,flash
from flask_login import current_user,login_required
from src.models.user import User

greeting_route = Blueprint('greeting',__name__)

@login_required
@greeting_route.route('/greeting')
def greeting():
    return render_template('greeting.html',user = current_user.user_name)