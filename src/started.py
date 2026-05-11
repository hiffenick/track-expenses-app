from flask import Blueprint,render_template

started_route = Blueprint('started',__name__)

@started_route.route('/started',methods=['GET','POST'])
def start():
    return render_template('get_started.html')