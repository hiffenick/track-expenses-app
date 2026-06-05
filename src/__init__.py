import os
from flask import Flask
from src.extensions import bcrypt
from src.extensions import limiter
from src.extensions import csrf
from flask_session import Session

from src.models.user import User
from src.models.expense import expenses
from src.models.cateogries import Category

from flask import session, redirect, url_for, request
from flask_login import current_user
from datetime import datetime, timezone ,timedelta
from src.core.limit import register_rate_limit_handler

from src.config import Config
from flask_migrate import Migrate
from src.extensions import db
from src.home import home_route
from src.test import test_route
from src.verify import verify_route
from src.login import login_route
from src.logout import logout_route
from flask_login import login_manager
from src.signup import signup_route
from src.started import started_route
from src.viewexpense import view_expenses_route
from src.categories import categories_route
from src.greeting import greeting_route
from src.extensions import mail
from src.profile import profile_route
from src.analytics import analytics_route
from src.extensions import loginmanager
from src.dashboard import dashboard_route
from src.addexpense import addexpense_route

from src.core.middleware import register_session_middleware

basedir = os.path.abspath(os.path.dirname(__file__))
staticpath = os.path.join(os.path.dirname(basedir),'static')
templatepath = os.path.join(os.path.dirname(basedir),'templates')

def createapp():
    app = Flask(__name__, template_folder=templatepath, static_folder=staticpath)
    app.config.from_object(Config)
    Session(app)

    loginmanager.session_protection = "strong"

    migrate = Migrate(app,db)
    loginmanager.init_app(app)
    csrf.init_app(app)
    bcrypt.init_app(app)
    db.init_app(app)
    mail.init_app(app)
    limiter.init_app(app)
    register_rate_limit_handler(app)
    register_session_middleware(app)
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
    app.register_blueprint(addexpense_route)
    app.register_blueprint(analytics_route)
    app.register_blueprint(categories_route)
    app.register_blueprint(view_expenses_route)
    app.register_blueprint(profile_route)

    return app  