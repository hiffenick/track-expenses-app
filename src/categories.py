print("CATEGORIES FILE LOADED")

from flask import Blueprint, render_template, request, jsonify
from sqlalchemy import or_
from src.extensions import db,limiter
from src.models.cateogries import Category
from src.models.expense import expenses
from src.wtform import CategoryForm
from flask_login import current_user, login_required
from datetime import datetime
from sqlalchemy import func

categories_route = Blueprint('categ', __name__)


# ── helper ────────────────────────────────────────────────────
def seed_default_categories(user_id):
    """Seed default categories for a brand-new user. Safe to call multiple times."""
    existing = Category.query.filter_by(user_id=user_id).first()
    if existing:
        return  # already seeded, skip

    defaults = [
        {"name": "Food",          "icon": "🍔", "color": "#f59e0b", "budget": 0.0},
        {"name": "Travel",        "icon": "✈️", "color": "#3b82f6", "budget": 0.0},
        {"name": "Shopping",      "icon": "🛍️", "color": "#ec4899", "budget": 0.0},
        {"name": "Bills",         "icon": "💡", "color": "#8b5cf6", "budget": 0.0},
        {"name": "Health",        "icon": "🏥", "color": "#10b981", "budget": 0.0},
        {"name": "Entertainment", "icon": "🎬", "color": "#f43f5e", "budget": 0.0},
        {"name": "Uncategorized", "icon": "📦", "color": "#6b7280", "budget": 0.0},
    ]
    for d in defaults:
        db.session.add(Category(
            name           = d["name"],
            icon           = d["icon"],
            color          = d["color"],
            monthly_budget = d["budget"],
            rollover       = False,
            is_default     = True,
            user_id        = user_id
        ))
    db.session.commit()


def _build_categories_data(user_id):
    """Shared logic for both the page route and API route."""
    now = datetime.now()

    # ✅ Only this user's own rows — no shared/null rows
    cats = Category.query.filter(
        Category.user_id == user_id,
        Category.name != "Uncategorized"
    ).all()

    result = []
    for c in cats:
        spent = db.session.query(func.sum(expenses.expense_amount)).filter(
            expenses.category_id == c.category_id,
            expenses.user_id     == user_id,
            func.extract('month', expenses.expense_date) == now.month,
            func.extract('year',  expenses.expense_date) == now.year
        ).scalar() or 0.0

        tx_count = db.session.query(func.count(expenses.expense_id)).filter(
            expenses.category_id == c.category_id,
            expenses.user_id     == user_id,
            func.extract('month', expenses.expense_date) == now.month,
            func.extract('year',  expenses.expense_date) == now.year
        ).scalar() or 0

        result.append({
            "id":              c.category_id,
            "name":            c.name,
            "icon":            c.icon or "📦",
            "color":           c.color or "#14b8a6",
            "budget":          c.monthly_budget or 0,
            "spent_month":     spent,
            "rollover":        c.rollover,
            "is_default":      c.is_default,
            "tx_count":        tx_count,
            "tx_amount":       spent,
            "monthly_history": []
        })
    return result


# ── Routes ────────────────────────────────────────────────────

@categories_route.route('/categories', methods=['GET'])
@login_required
@limiter.limit("60 per minute")
def categories():
    # Auto-seed if this user has never logged in before
    seed_default_categories(current_user.user_id)

    categories_data = _build_categories_data(current_user.user_id)
    form = CategoryForm()
    return render_template('categories.html',
        categories_json={"categories": categories_data},
        form=form,
        user=current_user.user_name
    )


@categories_route.route('/api/categories', methods=['GET'])
@login_required
@limiter.limit("60 per minute")
def get_categories():
    # Auto-seed here too (covers direct API calls)
    seed_default_categories(current_user.user_id)

    categories_data = _build_categories_data(current_user.user_id)
    return jsonify({"categories": categories_data})


@categories_route.route('/api/categories', methods=['POST'])
@login_required
@limiter.limit("20 per minute")
@limiter.limit("100 per day")
def create_category():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Validation failed"}), 400

    name = data.get('name', '').strip()
    if not name:
        return jsonify({"error": "Category name is required"}), 400

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
@limiter.limit("30 per minute")
@limiter.limit("200 per day")
def update_category(cat_id):
    # ✅ Only allow editing own categories
    cat = Category.query.filter(
        Category.category_id == cat_id,
        Category.user_id     == current_user.user_id
    ).first_or_404()

    data = request.get_json()
    if not data:
        return jsonify({"error": "Validation failed"}), 400

    cat.name           = data.get('name',     cat.name)
    cat.icon           = data.get('icon',     cat.icon)
    cat.color          = data.get('color',    cat.color)
    cat.monthly_budget = data.get('budget',   cat.monthly_budget)
    cat.rollover       = data.get('rollover', cat.rollover)

    db.session.commit()
    return jsonify({"success": True}), 200


@categories_route.route('/api/categories/<int:cat_id>', methods=['PATCH'])
@login_required
@limiter.limit("30 per minute")
@limiter.limit("200 per day")
def patch_category(cat_id):
    # ✅ Only allow patching own categories
    cat = Category.query.filter(
        Category.category_id == cat_id,
        Category.user_id     == current_user.user_id
    ).first_or_404()

    data = request.get_json()
    if 'rollover' in data:
        cat.rollover = data['rollover']
    db.session.commit()
    return jsonify({"success": True}), 200


@categories_route.route('/api/categories/<int:cat_id>', methods=['DELETE'])
@login_required
@limiter.limit("10 per minute")
@limiter.limit("50 per day")
def delete_category(cat_id):
    try:
        cat = Category.query.filter(
            Category.category_id == cat_id,
            Category.user_id     == current_user.user_id
        ).first_or_404()

        data        = request.get_json(silent=True) or {}
        reassign_to = data.get('reassign_to')

        if reassign_to:
            target_id = int(reassign_to)
        else:
            # ✅ Fall back to THIS user's own Uncategorized
            fallback = Category.query.filter_by(
                name    = "Uncategorized",
                user_id = current_user.user_id
            ).first()
            target_id = fallback.category_id if fallback else None

        if target_id:
            db.session.query(expenses).filter(
                expenses.category_id == cat_id
            ).update({"category_id": target_id}, synchronize_session=False)
        else:
            return jsonify({
                 "success": False,
                 "error": "Fallback category not found"
           }), 400
        db.session.delete(cat)
        db.session.commit()
        return jsonify({"success": True, "message": "Category deleted"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500