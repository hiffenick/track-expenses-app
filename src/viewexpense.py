from flask import Blueprint, render_template, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy import or_, extract,desc
from datetime import datetime
from src.extensions import db
from src.models.cateogries import Category
from src.models.expense import expenses as Expense   # adjust path if needed

view_expenses_route = Blueprint('viewexp', __name__)

# Serialize — include category name + icon for JS rendering
def serialize(e):
    return {
        'id':          e.expense_id,
        'title':       e.expense_title,
        'amount':      float(e.expense_amount),
        'date':        e.expense_date.strftime('%Y-%m-%d'),
        'note':        e.expense_note or '',
        'category':    e.category.name.lower() if e.category else 'other',
        'category_id': e.category_id,
        'icon':        e.category.icon if e.category else '💸',
        'is_regret':   e.is_regret,
    'regret_note': e.regret_note or '',
    }

@view_expenses_route.route('/viewexps', methods=['GET'])
@login_required
def viewexps():
    categories = Category.query.filter(
            Category.user_id == current_user.user_id,
            Category.name != "Uncategorized"
        ).all()

    all_expenses = Expense.query.filter_by( user_id=current_user.user_id ).order_by( desc(Expense.expense_date) ).all()

    serialized_expenses = [serialize(e) for e in all_expenses]

    categories_json = [
    {
        'id': c.category_id,
        'name': c.name,
        'label': c.name.lower(),
        'icon': c.icon
    }
        for c in categories
    ]

    return render_template('viewexpense.html', 
                           categories=categories,
                           categories_json=categories_json,
                           expenses=serialized_expenses, 
                           user=current_user.user_name)


# ─────────────────────────────────────────────────────────────────────────────
# CHART DATA  API  —  GET /viewexps/chart-data?month=5&year=2026
# ─────────────────────────────────────────────────────────────────────────────
@view_expenses_route.route('/viewexps/chart-data', methods=['GET'])
@login_required
def chart_data():
    try:
        month = int(request.args.get('month', 0))   # 0 = all months
        year = int(request.args.get('year', datetime.now().year))
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid params'}), 400

    # Base query — scoped to current user + year
    q = Expense.query.filter(
        Expense.user_id == current_user.user_id,
        extract('year', Expense.expense_date) == year
    )

    if month and 1 <= month <= 12:
        q = q.filter(extract('month', Expense.expense_date) == month)

    expense_rows = q.all()
    regret_count = sum(1 for e in expense_rows if e.is_regret)
    # ── Daily aggregation ─────────────────────────────────────────────────────
    daily = {}
    for e in expense_rows:
        key = e.expense_date.strftime('%Y-%m-%d')
        daily[key] = daily.get(key, 0) + float(e.expense_amount)

    # Fill every calendar day in range (no gaps)
    import calendar
    from datetime import date, timedelta

    if month and 1 <= month <= 12:
        days_in_month = calendar.monthrange(year, month)[1]
        start = date(year, month, 1)
        end   = date(year, month, days_in_month)
    else:
        start = date(year, 1, 1)
        end   = date(year, 12, 31)

    labels       = []
    daily_totals = []
    cumulative   = []
    running      = 0.0

    cur = start
    while cur <= end:
        key = cur.strftime('%Y-%m-%d')
        amt = daily.get(key, 0)
        running += amt

        if month and 1 <= month <= 12:
            labels.append(cur.day)           # 1, 2, 3 … 31
        else:
            labels.append(cur.strftime('%b %d'))   # Jan 01, Jan 02 …

        daily_totals.append(round(amt, 2))
        cumulative.append(round(running, 2))
        cur += timedelta(days=1)

    # ── Category breakdown ────────────────────────────────────────────────────
    cat_totals = {}
    for e in expense_rows:
        cid = e.category_id
        cat_totals[cid] = cat_totals.get(cid, 0) + float(e.expense_amount)

    cat_ids = list(cat_totals.keys())
    cats    = Category.query.filter(Category.category_id.in_(cat_ids)).all() if cat_ids else []
    cat_map = {c.category_id: {'name': c.name, 'icon': c.icon or '💸'} for c in cats}

    category_breakdown = [
        {
            'id':     cid,
            'label':  cat_map.get(cid, {}).get('name', str(cid)),
            'icon':   cat_map.get(cid, {}).get('icon', '💸'),
            'amount': round(amt, 2),
        }
        for cid, amt in sorted(cat_totals.items(), key=lambda x: -x[1])
    ]

    return jsonify({
        'labels':             labels,
        'daily_totals':       daily_totals,
        'cumulative':         cumulative,
        'category_breakdown': category_breakdown,
        'total':              round(running, 2),
        'tx_count':           len(expense_rows),
        'regret_count': regret_count,
        'month':              month,
        'year':               year,
    })

@view_expenses_route.route('/viewexps/expenses-data', methods=['GET'])
@login_required
def expenses_data():
    """
    Returns filtered, sorted expenses as JSON for the AJAX list renderer.
 
    Query params:
      year      (int)    — e.g. 2026
      month     (int)    — 1–12, or blank for all
      category  (int)    — category_id, or blank for all
      sort      (str)    — date-desc | date-asc | amount-desc | amount-asc
      search    (str)    — searches title + note (case-insensitive)
    """
    from sqlalchemy import or_, extract, asc, desc
 
    year_raw     = request.args.get('year',     '')
    month_raw    = request.args.get('month',    '')
    category_raw = request.args.get('category', '')
    sort_raw     = request.args.get('sort',     'date-desc')
    search_raw   = request.args.get('search',   '').strip()
 
    # Base query
    q = Expense.query.filter(Expense.user_id == current_user.user_id)
 
    # Year filter
    if year_raw:
        try:
            q = q.filter(extract('year', Expense.expense_date) == int(year_raw))
        except ValueError:
            pass
 
    # Month filter
    if month_raw:
        try:
            q = q.filter(extract('month', Expense.expense_date) == int(month_raw))
        except ValueError:
            pass
 
    # Category filter
    if category_raw:
        try:
            q = q.filter(Expense.category_id == int(category_raw))
        except ValueError:
            pass
 
    # Search filter (title OR note, case-insensitive)
    if search_raw:
        like = f'%{search_raw}%'
        q = q.filter(
            or_(
                Expense.expense_title.ilike(like),
                Expense.expense_note.ilike(like),
            )
        )
 
    # Sort
    sort_map = {
        'date-desc':   desc(Expense.expense_date),
        'date-asc':    asc(Expense.expense_date),
        'amount-desc': desc(Expense.expense_amount),
        'amount-asc':  asc(Expense.expense_amount),
    }
    q = q.order_by(sort_map.get(sort_raw, desc(Expense.expense_date)))
 
    rows = q.all()
 
    return jsonify({
        'expenses': [serialize(e) for e in rows],
        'count':    len(rows),
    })
 
@view_expenses_route.route("/delete-expense/<int:expense_id>", methods=["DELETE"])
@login_required
def delete_expense(expense_id):

    exp = Expense.query.filter(
        Expense.expense_id == expense_id,
        Expense.user_id == current_user.user_id
    ).first()

    if not exp:
        return jsonify({
            "success": False,
            "message": "Expense not found"
        }), 404

    try:
        db.session.delete(exp)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Expense deleted successfully",
            "id": expense_id
        })

    except Exception as e:
        db.session.rollback()
        print("DELETE ERROR:", e)

        return jsonify({
            "success": False,
            "message": "Failed to delete expense",
            "id": expense_id
        })
    
@view_expenses_route.route('/expenses/edit/<int:expense_id>', methods=['PUT'])
@login_required
def edit_expense(expense_id):

    data = request.get_json()

    expense = Expense.query.filter(
        Expense.expense_id == expense_id,
        Expense.user_id == current_user.user_id
    ).first()

    if not expense:
        return jsonify({
            'success': False,
            'message': 'Expense not found'
        }), 404

    try:
        expense.expense_title  = data.get('title')
        expense.expense_amount = float(data.get('amount'))
        expense.category_id = int(data.get('category'))
        expense.expense_date   = datetime.strptime(
            data.get('date'),
            '%Y-%m-%d'
        ).date()
        expense.expense_note   = data.get('note', '')

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Expense updated.'
        })

    except Exception as e:
        db.session.rollback()

        print("EDIT ERROR:", e)

        return jsonify({
            'success': False,
            'message': 'Failed to update expense.'
        }), 500
    
@view_expenses_route.route('/api/expenses/<int:expense_id>/regret', methods=['PATCH'])
@login_required
def tag_regret(expense_id):
    from flask import request as req
    data = req.get_json()
    exp = Expense.query.filter_by(
        expense_id=expense_id,
        user_id=current_user.user_id
    ).first_or_404()
    exp.is_regret = bool(data.get('is_regret', False))
    exp.regret_note = data.get('regret_note') or None
    db.session.commit()
    return jsonify({'success': True})