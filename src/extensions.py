from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_wtf import CSRFProtect
from flask_login import LoginManager
from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

mail = Mail()
db = SQLAlchemy()
bcrypt = Bcrypt()
csrf = CSRFProtect()
loginmanager = LoginManager()

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)
