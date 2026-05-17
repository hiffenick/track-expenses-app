from flask import Blueprint,render_template,request
from flask_login import login_required,current_user
from src.wtform import AddExpense
from src.models.expense import expenses
from src.models.cateogries import Category
from src.extensions import db

dashboard_route = Blueprint('dashboard',__name__)

from sqlalchemy import func,extract
from datetime import datetime

@dashboard_route.route('/dashboard', methods=['GET', 'POST'])
@login_required
def dashboard():
    now = datetime.now()

    # ✅ Total Spent (All Time)
    total_spent = db.session.query(func.coalesce(func.sum(expenses.expense_amount), 0)) \
        .filter_by(user_id=current_user.user_id) \
        .scalar()

    # ✅ Monthly Spent (Current Month)
    monthly_spent = db.session.query(func.coalesce(func.sum(expenses.expense_amount), 0)) \
        .filter(
            expenses.user_id == current_user.user_id,
            extract('month', expenses.expense_date) == now.month,
            extract('year', expenses.expense_date) == now.year
        ).scalar()

    # ✅ Category Totals (for top category + chart)
    category_tools_query = db.session.query(
        Category.name,
        func.sum(expenses.expense_amount)
    ).join(Category,expenses.category_id == Category.category_id).filter(expenses.user_id == current_user.user_id).group_by(Category.name).all()

    # ✅ Top Category
    if category_tools_query:
        top_category = max(category_tools_query, key=lambda x: x[1])[0]
    else:
        top_category = "N/A"

    # ✅ Prepare chart data
    chart_labels = [row[0] for row in category_tools_query]
    chart_values = [float(row[1]) for row in category_tools_query]  # convert Decimal to float if needed

    # ✅ Final summary object
    summary = {
        'total_spent': float(total_spent),
        'monthly_spent': float(monthly_spent),
        'top_category': top_category,
        'chart_data': {
            'labels': chart_labels,
            'values': chart_values
        }
    }

    all_expenses = expenses.query.filter_by(
    user_id=current_user.user_id
    ).all()

    # Get categories
    all_categories = Category.query.all()

    # Convert expenses into JSON-safe dicts
    expense_data = []

    for exp in all_expenses:
        expense_data.append({
            "expense_id": exp.expense_id,
            "title": exp.expense_title,
            "amount": float(exp.expense_amount),
            "date": exp.expense_date.strftime("%Y-%m-%d"),
            "category": exp.category.name if exp.category else "Other"
        })

    # Convert categories into JSON-safe dicts
    category_data = []

    for cat in all_categories:
        category_data.append({
            "id": cat.category_id,
            "name": cat.name
        })

    return render_template(
        'dashboard.html',
        user=current_user.user_name,
        summary=summary,
        expenses=expense_data,
        categories=category_data,
        now=now
    )
