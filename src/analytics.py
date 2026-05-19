from flask import Blueprint, render_template, jsonify,request
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

# ──────────────────────────────────────────────────────────────
# Helper: resolve date range from period string
# Returns (start_date, end_date, months_list, label)
# ──────────────────────────────────────────────────────────────
def _resolve_period(period: str, today: date):
    """
    Returns a dict with keys:
      start        – date  (first day of range)
      end          – date  (last day of range, inclusive)
      months_slots – list of {year, month, label} dicts (up to 6, for MoM chart)
      days_in_month– int   (days in the "current" month for projection)
      this_year    – int
      this_month   – int   (the focal month for daily/radar breakdown)
    """
    if period == 'this_week':
        # ISO week: Monday → today
        start = today - timedelta(days=today.weekday())
        end   = today
        # Build a single-month slot for MoM (still show current month context)
        months_slots = [{'year': today.year, 'month': today.month,
                          'label': today.strftime('%b')}]
        return {
            'start': start, 'end': end,
            'months_slots': months_slots,
            'days_in_month': monthrange(today.year, today.month)[1],
            'this_year': today.year, 'this_month': today.month,
        }
 
    if period == 'last_month':
        first_of_this = today.replace(day=1)
        last_month_end   = first_of_this - timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)
        months_slots = [
            {'year': last_month_start.year, 'month': last_month_start.month,
             'label': last_month_start.strftime('%b')}
        ]
        return {
            'start': last_month_start, 'end': last_month_end,
            'months_slots': months_slots,
            'days_in_month': monthrange(last_month_start.year, last_month_start.month)[1],
            'this_year': last_month_start.year, 'this_month': last_month_start.month,
        }
 
    if period == 'this_year':
        start = date(today.year, 1, 1)
        end   = today
        months_slots = []
        for m in range(1, today.month + 1):
            months_slots.append({'year': today.year, 'month': m,
                                  'label': date(today.year, m, 1).strftime('%b')})
        return {
            'start': start, 'end': end,
            'months_slots': months_slots[-6:],          # cap at 6 for chart
            'days_in_month': monthrange(today.year, today.month)[1],
            'this_year': today.year, 'this_month': today.month,
        }
 
    # Default: this_month
    start = today.replace(day=1)
    end   = today
    # Build 6-month rolling window (same as original)
    months_slots = []
    current = today.replace(day=1)
    for i in range(5, -1, -1):
        temp_month = current.month - i
        temp_year  = current.year
        while temp_month <= 0:
            temp_month += 12
            temp_year  -= 1
        d = date(temp_year, temp_month, 1)
        months_slots.append({'year': d.year, 'month': d.month, 'label': d.strftime('%b')})
 
    return {
        'start': start, 'end': end,
        'months_slots': months_slots,
        'days_in_month': monthrange(today.year, today.month)[1],
        'this_year': today.year, 'this_month': today.month,
    }
 
 

# ──────────────────────────────────────────────────────────────
# Main analytics API  — filter-aware
# ──────────────────────────────────────────────────────────────
@analytics_route.route('/api/analytics', methods=['GET'])
@login_required
def analytics_api():
    uid    = current_user.user_id
    today  = date.today()
 
    # ── Read query params ──────────────────────────────────────
    period   = request.args.get('period',   'this_month')   # time filter
    category = request.args.get('category', 'all').lower()  # category filter
 
    # Whitelist period values to prevent injection
    if period not in {'this_month', 'last_month', 'this_week', 'this_year'}:
        period = 'this_month'
 
    # ── Resolve date window ────────────────────────────────────
    pr = _resolve_period(period, today)
    start_date    = pr['start']
    end_date      = pr['end']
    months_slots  = pr['months_slots']
    days_in_month = pr['days_in_month']
    focal_year    = pr['this_year']
    focal_month   = pr['this_month']
 
    # ── Base expense query helper (applies user + date + optional cat) ──
    def base_q():
        q = (db.session.query(expenses)
             .filter(expenses.user_id == uid)
             .filter(expenses.expense_date >= start_date)
             .filter(expenses.expense_date <= end_date))
        if category != 'all':
            q = (q.join(Category, expenses.category_id == Category.category_id)
                  .filter(func.lower(Category.name) == category))
        return q
 
    # ── 1. MoM per category ────────────────────────────────────
    cat_colors = {
        'food': '#f97316', 'travel': '#3b82f6', 'shopping': '#ec4899',
        'bills': '#f59e0b', 'entertainment': '#a855f7', 'savings': '#22c55e',
    }
 
    mom_q = (db.session.query(
                 Category.name,
                 extract('year',  expenses.expense_date).label('yr'),
                 extract('month', expenses.expense_date).label('mo'),
                 func.sum(expenses.expense_amount).label('total'))
             .join(expenses, expenses.category_id == Category.category_id)
             .filter(expenses.user_id == uid)
             .filter(expenses.expense_date >= months_slots[0]['year'].__str__() + '-01-01')
             .filter(expenses.expense_date <= end_date))
 
    if category != 'all':
        mom_q = mom_q.filter(func.lower(Category.name) == category)
 
    rows = mom_q.group_by(
        Category.name,
        extract('year',  expenses.expense_date),
        extract('month', expenses.expense_date)
    ).all()
 
    mom = {}
    for row in rows:
        cat = row.name.lower()
        if cat not in mom:
            mom[cat] = [0] * len(months_slots)
        for idx, slot in enumerate(months_slots):
            if int(row.yr) == slot['year'] and int(row.mo) == slot['month']:
                mom[cat][idx] += float(row.total)
 
    # ── 2. Daily array for focal month ────────────────────────
    daily_q = (db.session.query(
                   expenses.expense_date,
                   func.sum(expenses.expense_amount).label('daily'))
               .filter(expenses.user_id == uid)
               .filter(extract('year',  expenses.expense_date) == focal_year)
               .filter(extract('month', expenses.expense_date) == focal_month)
               .filter(expenses.expense_date <= end_date))
 
    if category != 'all':
        daily_q = (daily_q
                   .join(Category, expenses.category_id == Category.category_id)
                   .filter(func.lower(Category.name) == category))
 
    current_month_rows = (daily_q
                          .group_by(expenses.expense_date)
                          .order_by(expenses.expense_date)
                          .all())
 
    daily = {}
    for r in current_month_rows:
        daily[r.expense_date.day] = float(r.daily)
 
    daily_array = [
        daily.get(d, None if d > end_date.day else 0)
        for d in range(1, days_in_month + 1)
    ]
 
    month_total = sum(v for v in daily_array if v is not None)
 
    # ── 3. Last month total (for delta) ───────────────────────
    first_of_focal   = date(focal_year, focal_month, 1)
    last_month_date  = (first_of_focal - timedelta(days=1))
 
    last_q = (db.session.query(func.sum(expenses.expense_amount))
              .filter(expenses.user_id == uid)
              .filter(extract('year',  expenses.expense_date) == last_month_date.year)
              .filter(extract('month', expenses.expense_date) == last_month_date.month))
    if category != 'all':
        last_q = (last_q
                  .join(Category, expenses.category_id == Category.category_id)
                  .filter(func.lower(Category.name) == category))
    last_total = last_q.scalar() or 0
 
    # ── 4. Heatmap ─────────────────────────────────────────────
    first_weekday = date(focal_year, focal_month, 1).weekday()
    heatmap       = []
    day_cursor    = 1
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
                    'label': f"{date(focal_year, focal_month, 1).strftime('%b')} {day_cursor}"
                })
                day_cursor += 1
        heatmap.append(row_cells)
 
    # ── 5. No-spend streak ─────────────────────────────────────
    all_spend_q = (db.session.query(expenses.expense_date)
                   .filter(expenses.user_id == uid)
                   .filter(expenses.expense_date >= start_date)
                    .filter(expenses.expense_date <= end_date)
                    )
    if category != 'all':
        all_spend_q = (all_spend_q
                       .join(Category, expenses.category_id == Category.category_id)
                       .filter(func.lower(Category.name) == category))
    all_spend_days = {r.expense_date for r in all_spend_q.all()}
 
    first_expense_date = (
        db.session.query(func.min(expenses.expense_date))
        .filter(expenses.user_id == uid)
        .scalar()
    )

    # fallback safety
    if not first_expense_date:
        first_expense_date = today
 
    # current streak
    current_streak = 0
    check = end_date
    while check >= first_expense_date:
        if check not in all_spend_days:
            current_streak += 1
            check -= timedelta(days=1)
        else:
            break
 
    # best streak + no-spend count
    best_streak    = 0
    temp_streak    = 0
    no_spend_days  = 0
    check          = today
    while check >= first_expense_date:
        if check not in all_spend_days:
            no_spend_days += 1
            temp_streak   += 1
            best_streak    = max(best_streak, temp_streak)
        else:
            temp_streak = 0
        check -= timedelta(days=1)
 
    # ── 6. Streak calendar (last 5 months) ────────────────────
    streak_months = []

# determine which months to show based on active filter
    months_to_render = months_slots

    for slot in months_to_render:

        d = date(slot['year'], slot['month'], 1)

        m_days = monthrange(d.year, d.month)[1]

        days_list = []

        for day in range(1, m_days + 1):

            dt = date(d.year, d.month, day)

            # future dates
            if dt > end_date:
                days_list.append('future')

            # before user started using app
            elif dt < first_expense_date:
                days_list.append('future')

            # spending happened
            elif dt in all_spend_days:
                days_list.append('spent')

            # no spend
            else:
                days_list.append('nospend')

        streak_months.append({
            'label': d.strftime('%b'),
            'days': days_list
        })

    # ── 7. Radar — category breakdown ─────────────────────────
    radar_axes = ['Food', 'Travel', 'Savings', 'Shopping', 'Entertainment', 'Bills']
 
    cat_q = (db.session.query(
                 Category.name,
                 func.sum(expenses.expense_amount).label('total'))
             .join(expenses, expenses.category_id == Category.category_id)
             .filter(expenses.user_id == uid)
             .filter(expenses.expense_date >= start_date)
             .filter(expenses.expense_date <= end_date))
    if category != 'all':
        cat_q = cat_q.filter(func.lower(Category.name) == category)
    cat_month = cat_q.group_by(Category.name).all()
 
    radar_map = {r.name.lower(): float(r.total) for r in cat_month}
    radar_max = max(radar_map.values(), default=1)
    radar_may = [round(radar_map.get(a.lower(), 0) / radar_max * 100) for a in radar_axes]
 
    # previous period radar (last month relative to focal)
    last_cat_q = (db.session.query(
                      Category.name,
                      func.sum(expenses.expense_amount).label('total'))
                  .join(expenses, expenses.category_id == Category.category_id)
                  .filter(expenses.user_id == uid)
                  .filter(extract('year',  expenses.expense_date) == last_month_date.year)
                  .filter(extract('month', expenses.expense_date) == last_month_date.month))
    if category != 'all':
        last_cat_q = last_cat_q.filter(func.lower(Category.name) == category)
    last_radar_map = {r.name.lower(): float(r.total) for r in last_cat_q.group_by(Category.name).all()}
    last_max   = max(last_radar_map.values(), default=1)
    radar_apr  = [round(last_radar_map.get(a.lower(), 0) / last_max * 100) for a in radar_axes]
 
    # ── 8. Transaction count ───────────────────────────────────
    tx_count = len(current_month_rows)
 
    return jsonify({
        'months':         [s['label'] for s in months_slots],
        'mom':            mom,
        'cat_colors':     cat_colors,
        'daily_array':    daily_array,
        'month_total':    month_total,
        'tx_count':       tx_count,
        'last_total':     float(last_total),
        'days_in_month':  days_in_month,
        'heatmap':        heatmap,
        'streak': {
            'current':       current_streak,
            'best':          best_streak,
            'no_spend_days': no_spend_days,
            'months':        streak_months,
        },
        'radar': {
            'axes': radar_axes,
            'may':  radar_may,
            'apr':  radar_apr,
        },
        'today_day':   today.day,
        'month_label': date(focal_year, focal_month, 1).strftime('%B %Y'),
        # Echo back active filters so the frontend can use them
        'active_filters': {
            'period':   period,
            'category': category,
        },
    })
 



