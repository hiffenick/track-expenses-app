import os
from flask import Flask
from src.extensions import bcrypt
from src.extensions import csrf

from src.config import Config
from src.extensions import db
from src.home import home_route
from src.test import test_route
from src.verify import verify_route
from src.login import login_route
from src.models.user import User
from src.models.expense import expenses
from flask_migrate import Migrate
from src.logout import logout_route
from flask_login import login_manager
from src.signup import signup_route
from src.started import started_route
from src.greeting import greeting_route
from src.extensions import mail
from src.extensions import loginmanager
from src.dashboard import dashboard_route

basedir = os.path.abspath(os.path.dirname(__file__))
staticpath = os.path.join(os.path.dirname(basedir),'static')
templatepath = os.path.join(os.path.dirname(basedir),'templates')
def createapp():
    app = Flask(__name__, template_folder=templatepath, static_folder=staticpath)
    app.config.from_object(Config)
    
    loginmanager.init_app(app)
    migrate = Migrate(app,db)
    csrf.init_app(app)
    bcrypt.init_app(app)
    db.init_app(app)
    mail.init_app(app)
    loginmanager.login_view = 'login.login'

    app.register_blueprint(home_route)
    app.register_blueprint(started_route)
    app.register_blueprint(signup_route)
    app.register_blueprint(login_route)
    app.register_blueprint(dashboard_route)
    app.register_blueprint(test_route)
    app.register_blueprint(logout_route)
    app.register_blueprint(verify_route)
    app.register_blueprint(greeting_route)
    return app  