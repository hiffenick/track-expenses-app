from sqlalchemy import text
from src.extensions import db
from flask import Blueprint,jsonify

test_route = Blueprint('test',__name__)

@test_route.route('/testdb')
def test():
    try:
        result = db.session.execute(text("SELECT 1"))
        return jsonify({"status":"sucess" , "result": result.scalar()})
    except Exception as e:
        return jsonify({"status" : "failed" ,"error": str(e)})
