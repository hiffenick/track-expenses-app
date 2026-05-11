from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_wtf import CSRFProtect
from flask_login import LoginManager
from flask_mail import Mail


mail = Mail()
db = SQLAlchemy()
bcrypt = Bcrypt()
csrf = CSRFProtect()
loginmanager = LoginManager()