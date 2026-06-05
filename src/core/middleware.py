# src/core/middleware.py

from flask import session, request, redirect, url_for
from flask_login import current_user, logout_user
from datetime import datetime, timezone

def register_session_middleware(app):

    @app.before_request
    def enforce_session_timeout():

        excluded = {'login', 'logout', 'static', 'verify'}

        if request.endpoint and any(e in request.endpoint for e in excluded):
            return

        if current_user.is_authenticated:
            last_active = session.get('_last_active')
            now = datetime.now(timezone.utc).timestamp()

            timeout_seconds = app.config['PERMANENT_SESSION_LIFETIME'].total_seconds()

            if last_active and (now - last_active) > timeout_seconds:
                session.clear()
                logout_user()
                return redirect(url_for('login.login'))

            session['_last_active'] = now
            session.modified = True