print("CATEGORIES FILE LOADED")

from flask import Blueprint, render_template, request, redirect, url_for, jsonify
from sqlalchemy import or_
from src.extensions import db
from src.models.cateogries import Category
from src.models.expense import expenses       # adjust to your actual path
from src.wtform import CategoryForm
from flask_login import current_user, login_required
from datetime import datetime
from sqlalchemy import func

categories_route = Blueprint('categ', __name__)

@categories_route.route('/categories', methods=['GET'])
@login_required
def categories():
    now  = datetime.now()
    cats = Category.query.filter(
        or_(
            Category.user_id == current_user.user_id,
            Category.is_default == True
        ),
        Category.name != "Uncategorized"
    ).all()

    categories_data = []
    for c in cats:
        spent = db.session.query(func.sum(expenses.expense_amount)).filter(
            expenses.category_id == c.category_id,
            func.extract('month', expenses.expense_date) == now.month,
            func.extract('year',  expenses.expense_date) == now.year
        ).scalar() or 0.0

        tx_count = db.session.query(func.count(expenses.expense_id)).filter(
            expenses.category_id == c.category_id,
            func.extract('month', expenses.expense_date) == now.month,
            func.extract('year',  expenses.expense_date) == now.year
        ).scalar() or 0

        categories_data.append({
            "id":            c.category_id,
            "name":          c.name,
            "icon":          c.icon or "📦",
            "color":         c.color or "#14b8a6",
            "budget":        c.monthly_budget or 0,
            "spent_month":   spent,
            "rollover":      c.rollover,
            "is_default":    c.is_default,
            "tx_count":      tx_count,
            "tx_amount":     spent,
            "monthly_history": []   # fill in later when you have history
        })

    form = CategoryForm()
    return render_template('categories.html',
        categories_json={"categories": categories_data},
        form=form
    )

@categories_route.route('/api/categories', methods=['GET'])
@login_required
def get_categories():
    now = datetime.now()

    cats = Category.query.filter(
        or_(
            Category.user_id == current_user.user_id,
            Category.is_default == True
        ),
        Category.name != "Uncategorized"
    ).all()

    categories_data = []

    for c in cats:
        spent = db.session.query(func.sum(expenses.expense_amount)).filter(
            expenses.category_id == c.category_id,
            func.extract('month', expenses.expense_date) == now.month,
            func.extract('year', expenses.expense_date) == now.year
        ).scalar() or 0.0

        tx_count = db.session.query(func.count(expenses.expense_id)).filter(
            expenses.category_id == c.category_id,
            func.extract('month', expenses.expense_date) == now.month,
            func.extract('year', expenses.expense_date) == now.year
        ).scalar() or 0

        categories_data.append({
            "id": c.category_id,
            "name": c.name,
            "icon": c.icon or "📦",
            "color": c.color or "#14b8a6",
            "budget": c.monthly_budget or 0,
            "spent_month": spent,
            "rollover": c.rollover,
            "is_default": c.is_default,
            "tx_count": tx_count,
            "tx_amount": spent,
            "monthly_history": []
        })

    return jsonify({
        "categories": categories_data
    })


@categories_route.route('/api/categories', methods=['POST'])
@login_required
def create_category():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Validation failed"}), 400

    name = data.get('name','').strip()

    if not name:
        return jsonify({
            "error":"Category name is required"
        }), 400
    
    cat = Category(
        name           = name,
        icon           = data.get('icon', '📦'),
        color          = data.get('color', '#14b8a6'),
        monthly_budget = data.get('budget') or 0.0,
        rollover       = data.get('rollover', False),
        is_default     = False,
        user_id        = current_user.user_id
    )

    db.session.add(cat)
    db.session.commit()
    return jsonify({"success": True, "id": cat.category_id}), 201


@categories_route.route('/api/categories/<int:cat_id>', methods=['PUT'])
@login_required
def update_category(cat_id):
    # print("CAT ID:", cat_id)
    # print("CURRENT USER:", current_user.user_id)

    cat = Category.query.filter(
    Category.category_id == cat_id,
        or_(
            Category.user_id == current_user.user_id,
            Category.is_default == True
        )
    ).first_or_404()

    data = request.get_json()
    if not data:
        return jsonify({"error": "Validation failed"}), 400

    cat.name = data.get('name', cat.name)
    cat.icon = data.get('icon', cat.icon)
    cat.color = data.get('color', cat.color)
    cat.monthly_budget = data.get('budget', cat.monthly_budget)
    cat.rollover = data.get('rollover', cat.rollover)

    db.session.commit()
    return jsonify({"success": True}), 200


@categories_route.route('/api/categories/<int:cat_id>', methods=['PATCH'])
@login_required
def patch_category(cat_id):
    # Used for quick rollover toggle from table view
    cat = Category.query.filter(
    Category.category_id == cat_id,
        or_(
            Category.user_id == current_user.user_id,
            Category.is_default == True
        )
    ).first_or_404()

    data = request.get_json()
    if 'rollover' in data:
        cat.rollover = data['rollover']
    db.session.commit()
    return jsonify({"success": True}), 200


@categories_route.route('/api/categories/<int:cat_id>', methods=['DELETE'])
@login_required
def delete_category(cat_id):

    try:
        cat = Category.query.filter(
            Category.category_id == cat_id,
            Category.user_id == current_user.user_id
        ).first_or_404()

        # 🔥 check if category has transactions
        tx_exists = db.session.query(expenses).filter(
            expenses.category_id == cat_id
        ).first()

        if tx_exists:
            return jsonify({
                "success": False,
                "error": "Cannot delete category with transactions"
            }), 400

        db.session.delete(cat)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Category deleted"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500