from src.extensions import csrf
from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for
from sqlalchemy import or_
from flask_login import current_user
from src.extensions import db
from src.models.cateogries import Category
from datetime import datetime, date
from flask_login import login_required
from src.models.expense import expenses
from src.wtform import ExpenseForm

addexpense_route = Blueprint('addexpense', __name__)

# =========================
# GET → Show Add Expense Page
# =========================
@addexpense_route.route("/add", methods=["GET"])
@login_required
def show_addexpense():

    form = ExpenseForm()

    categories = Category.query.filter(
        or_(
            Category.user_id == current_user.user_id,
            Category.is_default == True
        ),
        Category.name != "Uncategorized"
    ).all()

    return render_template(
        "addexpense.html",
        categories=categories,
        today=date.today(),
        form=form
    )

@addexpense_route.route('/create-category', methods=['POST'])
@login_required
def create_category():

    data = request.get_json(force=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "No JSON received"
        }), 400

    name = data.get("name")
    icon = data.get("icon")

    if not name:
        return jsonify({
            "success": False,
            "message": "Category name required"
        }), 400

    new_category = Category(
        name=name,
        icon=icon,
        user_id=current_user.user_id,
        is_default=False
    )

    db.session.add(new_category)
    db.session.commit()

    return jsonify({
        "success": True,
        "category": {
            "id": new_category.category_id,
            "name": new_category.name,
            "icon": new_category.icon
        }
    })


# @addexpense_route.route("/delete-category/<int:cat_id>", methods=["DELETE"])
# @login_required
# def delete_category(cat_id):

#     category = Category.query.filter(
#         Category.category_id == cat_id,
#         or_(
#             Category.is_default == True,
#             Category.user_id == current_user.user_id
#         )
#     ).first()

#     if not category:
#         return jsonify({
#             "success": False,
#             "message": "Invalid category"
#         }), 400

#     if category.is_default:
#         return jsonify({
#             "success": False,
#             "message": "Default category cannot be deleted"
#         }), 403

#     db.session.delete(category)
#     db.session.commit()

#     return jsonify({
#         "success": True,
#         "message": "Category deleted",
#         "id": cat_id
#     })

# =========================
# POST → Handle Form Submit
# =========================


@addexpense_route.route("/add", methods=["POST"])
@login_required
def addexpense():

    form = ExpenseForm()

    print("FORM DATA:", request.form)
    print("CSRF IN FORM:", request.form.get('csrf_token'))
    print("CSRF HEADER:", request.headers.get('X-CSRFToken'))

    if not form.validate():
        print("FORM ERRORS:", form.errors)
        print(request.form)

        errors = []
        for field, msgs in form.errors.items():
            for msg in msgs:
                errors.append(f"{field}: {msg}")

        return jsonify({
            "success": False,
            "message": "Validation failed",
            "errors": errors
        }), 422

    try:
        title = form.title.data
        amount = float(form.amount.data)
        category_id = int(form.category.data)
        exp_date = form.date.data
        note = form.note.data

        category = Category.query.filter(
            Category.category_id == category_id,
            or_(
                Category.is_default == True,
                Category.user_id == current_user.user_id
            )
        ).first()

        if not category:
            return jsonify({
                "success": False,
                "message": "Invalid category"
            }), 400

        new_expense = expenses(
            expense_title=title,
            expense_amount=amount,
            expense_date=exp_date,
            expense_note=note,
            user_id=current_user.user_id,
            category_id=category.category_id
        )

        db.session.add(new_expense)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Expense added successfully!",
            "redirect": url_for("addexpense.addexpense")
        })

    except Exception as e:
        db.session.rollback()
        print("ERROR:", e)

        return jsonify({
            "success": False,
            "message": "Server error"
        }), 500    
