# Expenso 🧾

A full-stack personal expense tracker built with Flask — featuring a premium dark UI, analytics, budgeting, and production deployment on Railway.

---

## ✨ Features

### 🔐 Authentication & Security
- Signup / Login with secure password hashing
- Server-side sessions via **Flask-Session**
- Rate limiting on auth routes via **Flask-Limiter**
- OTP-verified account deletion

### 💸 Expense Management
- Add, edit, and delete expenses with full detail (amount, category, date, notes)
- **Regret tagging** — mark expenses you regret with an optional note (hover-reveal UI)
- Global search modal to find expenses instantly
- CSV export of your full expense history

### 📊 Dashboard & Analytics
- Overview dashboard with expense summary and recent history
- **Analytics page** — async-powered charts via a `/api/analytics` REST endpoint
- **Cumulative chart toggle** — switch between period and running total views
- Category-wise spend breakdown with circular arc budget gauges

### 🗂 Categories & Budgets
- Per-user category isolation with auto-seeding on registration
- Set monthly budgets per category with a rollover budget system
- Smart merge/reassign flow when deleting a category

### 👤 Profile & Settings
- Edit profile details and preferences
- Notification panel
- Account deletion (OTP-verified)

### 🚀 Deployment
- Deployed on **Railway** with **PostgreSQL**
- Environment-based config (SQLite locally, PostgreSQL in production)
- Alembic migrations for schema management

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Sessions | Flask-Session (server-side) |
| Rate Limiting | Flask-Limiter |
| Frontend | HTML, CSS, Vanilla JS |
| Templating | Jinja2 (`base.html` inheritance) |
| Testing | Selenium (14 tests) |
| Hosting | Railway |

---

## 🎨 Design System

- Background: `#0a0a0c` with glass-card components
- Accent: Amber `#e8a84c`
- Typography: DM Serif Display / DM Sans
- Animations: `fadeSlideUp` throughout
- Zero external UI frameworks — pure CSS custom properties

---

## 📁 Project Structure

```
expenso/
│
├── src/
│   ├── models/
│   │   ├── user.py
│   │   ├── expense.py
│   │   └── categories.py
│   ├── login.py
│   ├── signup.py
│   ├── dashboard.py
│   ├── addexpense.py
│   ├── viewexpense.py
│   ├── analytics.py
│   ├── categories.py
│   └── profile.py
│
├── templates/
│   ├── base.html
│   ├── dashboard.html
│   ├── analytics.html
│   ├── categories.html
│   ├── profile.html
│   └── ...
│
├── static/
│   ├── css/
│   └── js/
│
├── tests/                  # Selenium test suite
├── migrations/             # Alembic migration scripts
├── run.py
├── requirements.txt
└── .gitignore
```

---

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/hiffenick/track-expenses-app.git
cd track-expenses-app
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set up environment variables

Create a `.env` file in the root directory:

```env
SECRET_KEY=your_secret_key_here
DATABASE_URL=sqlite:///expenses.db
```

For production (Railway), set `DATABASE_URL` to your PostgreSQL connection string.

### 5. Run database migrations

```bash
flask db upgrade
```

### 6. Start the app

```bash
python run.py
```

Visit `http://localhost:5000`

---

## 🧪 Testing

The project includes a Selenium test suite covering dashboard, expenses, and categories flows.

```bash
pytest tests/
```

14 tests across 3 modules.

---

## 🗃 Database Migrations

```bash
flask db migrate -m "describe your change"
flask db upgrade
```

---

## 📌 Environment Variables

| Variable | Description |
|---|---|
| `SECRET_KEY` | Flask secret key for session signing |
| `DATABASE_URL` | SQLite URI locally, PostgreSQL URI on Railway |

> ⚠️ Never commit your `.env` file — it's in `.gitignore`.

---

## 🙋‍♂️ Author

**Nikhil** — [@hiffenick](https://github.com/hiffenick)

---

## 📄 License

MIT License