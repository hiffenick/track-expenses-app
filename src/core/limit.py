# src/core/limit.py
from flask import render_template

def register_rate_limit_handler(app):
    @app.errorhandler(429)
    def ratelimit_handler(e):
        return render_template('429.html'), 429