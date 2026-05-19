from flask import Blueprint, render_template, jsonify
from flask_login import login_required, current_user
from src.extensions import db
from src.models.expense import expenses
from src.models.cateogries import Category
from sqlalchemy import func, extract
from datetime import date, timedelta
from calendar import monthrange
import datetime

analytics_route = Blueprint('analys', __name__)

@analytics_route.route('/analytics', methods=['GET'])
@login_required
def analytics():
    return render_template('analytics.html',
                           analytics_data={},
                           user=current_user.user_name)


@analytics_route.route('/api/analytics', methods=['GET'])
@login_required
def analytics_api():
    uid   = current_user.user_id
    today = date.today()
    year  = today.year

    # ── 1. Last 6 months of data ───────────────────────────────
    six_months = []

    current = today.replace(day=1)

    for i in range(5, -1, -1):
        temp_month = current.month - i
        temp_year = current.year

        while temp_month <= 0:
            temp_month += 12
            temp_year -= 1

        d = date(temp_year, temp_month, 1)

        six_months.append({
            'year': d.year,
            'month': d.month,
            'label': d.strftime('%b')
        })

    # ── 2. MoM per category ────────────────────────────────────
    rows = (db.session.query(
                Category.name,
                extract('year',  expenses.expense_date).label('yr'),
                extract('month', expenses.expense_date).label('mo'),
                func.sum(expenses.expense_amount).label('total'))
            .join(expenses, expenses.category_id == Category.category_id)
            .filter(expenses.user_id == uid)
            .filter(expenses.expense_date >= six_months[0]['year'].__str__() + '-01-01')
            .group_by(
                Category.name,
                extract('year', expenses.expense_date),
                extract('month', expenses.expense_date)
            )
            .all())

    # Build { category: [jan, feb, ...] } keyed on 6-month slots
    cat_colors = {
        'food': '#f97316', 'travel': '#3b82f6', 'shopping': '#ec4899',
        'bills': '#f59e0b', 'entertainment': '#a855f7', 'savings': '#22c55e',
    }
    mom = {}
    for row in rows:
        cat = row.name.lower()
        if cat not in mom:
            mom[cat] = [0] * 6
        for idx, slot in enumerate(six_months):
            if int(row.yr) == slot['year'] and int(row.mo) == slot['month']:
                mom[cat][idx] += float(row.total)

    # ── 3. Current month totals ────────────────────────────────
    current_month_rows = (db.session.query(
                expenses.expense_date,
                func.sum(expenses.expense_amount).label('daily'))
            .filter(expenses.user_id == uid)
            .filter(extract('year',  expenses.expense_date) == today.year)
            .filter(extract('month', expenses.expense_date) == today.month)
            .group_by(expenses.expense_date)
            .order_by(expenses.expense_date)
            .all())

    days_in_month = monthrange(today.year, today.month)[1]
    daily = {}
    for r in current_month_rows:
        daily[r.expense_date.day] = float(r.daily)

    daily_array = [daily.get(d, None if d > today.day else 0)
                   for d in range(1, days_in_month + 1)]

    month_total = sum(v for v in daily_array if v is not None)

    # ── 4. Last month total (for delta) ───────────────────────
    last_month_date = (today.replace(day=1) - timedelta(days=1))
    last_total = db.session.query(func.sum(expenses.expense_amount))\
        .filter(expenses.user_id == uid)\
        .filter(extract('year',  expenses.expense_date) == last_month_date.year)\
        .filter(extract('month', expenses.expense_date) == last_month_date.month)\
        .scalar() or 0

    # ── 5. Heatmap — current month daily amounts ───────────────
    # May 1 2026 = Friday; weekday() → 0=Mon
    first_weekday = date(today.year, today.month, 1).weekday()
    heatmap = []
    day_cursor = 1
    for week in range(6):
        row_cells = []
        for dow in range(7):
            idx = week * 7 + dow
            if idx < first_weekday or day_cursor > days_in_month:
                row_cells.append({'day': None, 'amount': 0, 'label': ''})
            else:
                amt = daily.get(day_cursor, 0)
                row_cells.append({
                    'day': day_cursor,
                    'amount': amt,
                    'label': f"{today.strftime('%b')} {day_cursor}"
                })
                day_cursor += 1
        heatmap.append(row_cells)

    # ── 6. No-spend streak ─────────────────────────────────────
    # Days with 0 spend from today backwards
    all_spend_days = {r.expense_date for r in
        db.session.query(expenses.expense_date)
        .filter(expenses.user_id == uid)
        .filter(extract('year', expenses.expense_date) == today.year)
        .all()}

    first_expense = db.session.query(
    func.min(expenses.expense_date)
    ).filter(
        expenses.user_id == uid
    ).scalar()

    first_expense_date = first_expense or today

    current_streak = 0
    best_streak    = 0
    temp_streak    = 0
    no_spend_days  = 0
    check = today
    while check >= first_expense_date:
        if check not in all_spend_days:
            no_spend_days += 1
            temp_streak += 1
            best_streak = max(best_streak, temp_streak)
        else:
            temp_streak = 0

        check -= timedelta(days=1)
    # Simpler current streak: count backwards from today

    first_expense_date = first_expense or today
    current_streak = 0
    check = today
    while check >= first_expense_date:
        if check not in all_spend_days:
            current_streak += 1
            check -= timedelta(days=1)
        else:
            break

    # ── 7. Streak calendar (last 5 months) ────────────────────
    streak_months = []
    for i in range(4, -1, -1):

        temp_month = today.month - i
        temp_year = today.year

        while temp_month <= 0:
            temp_month += 12
            temp_year -= 1

        d = date(temp_year, temp_month, 1)
        m_year, m_month = d.year, d.month
        m_days = monthrange(m_year, m_month)[1]
        days_list = []
        for day in range(1, m_days + 1):
            dt = date(m_year, m_month, day)
            if dt > today:
                days_list.append('future')
            elif dt < first_expense_date:
                days_list.append('future')
            elif dt in all_spend_days:
                days_list.append('spent')
            else:
                days_list.append('nospend')
        streak_months.append({'label': d.strftime('%b'), 'days': days_list})

    # ── 8. Category radar (current month %) ───────────────────
    cat_month = (db.session.query(
                    Category.name,
                    func.sum(expenses.expense_amount).label('total'))
                .join(expenses, expenses.category_id == Category.category_id)
                .filter(expenses.user_id == uid)
                .filter(extract('year',  expenses.expense_date) == today.year)
                .filter(extract('month', expenses.expense_date) == today.month)
                .group_by(Category.name)
                .all())

    radar_axes = ['Food', 'Travel', 'Savings', 'Shopping', 'Entertainment', 'Bills']
    radar_map  = {r.name.lower(): float(r.total) for r in cat_month}
    radar_max  = max(radar_map.values(), default=1)
    radar_may  = [round(radar_map.get(a.lower(), 0) / radar_max * 100) for a in radar_axes]

    last_cat_month = (db.session.query(
                    Category.name,
                    func.sum(expenses.expense_amount).label('total'))
                .join(expenses, expenses.category_id == Category.category_id)
                .filter(expenses.user_id == uid)
                .filter(extract('year',  expenses.expense_date) == last_month_date.year)
                .filter(extract('month', expenses.expense_date) == last_month_date.month)
                .group_by(Category.name)
                .all())
    last_radar_map = {r.name.lower(): float(r.total) for r in last_cat_month}
    last_max   = max(last_radar_map.values(), default=1)
    radar_apr  = [round(last_radar_map.get(a.lower(), 0) / last_max * 100) for a in radar_axes]

    return jsonify(
        {
        'months':         [s['label'] for s in six_months],
        'mom':            mom,
        'cat_colors':     cat_colors,
        'daily_array':    daily_array,
        'month_total':    month_total,
         'tx_count':       len(current_month_rows),
        'last_total':     float(last_total),
        'days_in_month':  days_in_month,
        'heatmap':        heatmap,
        'streak': {
            'current':      current_streak,
            'best':         best_streak,
            'no_spend_days': no_spend_days,
            'months':       streak_months,
        },
        'radar': {
            'axes': radar_axes,
            'may':  radar_may,
            'apr':  radar_apr,
        },
        'today_day': today.day,
        'month_label': today.strftime('%B %Y'),
    })