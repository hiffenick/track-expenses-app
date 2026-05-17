# 🧾 Track Expenses App

A Flask-based personal expense tracker that lets users manage, view, and edit their daily expenses with a clean UI and session-based authentication.

---

## 🚀 Features

### 🔐 Authentication
- User Signup & Login
- Secure session-based authentication
- Logout support

### 💰 Expense Management
- Add new expenses with categories
- View all expenses in a dedicated page
- Edit expenses via modal UI
- Delete expenses

### 📊 Dashboard
- User overview dashboard
- Expense summary and history
- Interactive frontend with vanilla JS

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python, Flask |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Database | SQLite |
| Frontend | HTML, CSS, JavaScript (Vanilla) |
| Auth | Flask session-based |
| Version Control | Git + GitHub |

---

## 📁 Project Structure

```
track-expenses-app/
│
├── src/                    # Flask app modules
│   ├── models/             # SQLAlchemy models
│   │   ├── user.py
│   │   ├── expense.py
│   │   └── categories.py
│   ├── login.py
│   ├── signup.py
│   ├── dashboard.py
│   ├── addexpense.py
│   ├── viewexpense.py
│   └── ...
│
├── templates/              # HTML templates
├── static/                 # CSS, JS files
├── migrations/             # Alembic migration scripts
├── run.py                  # App entry point
├── requirements.txt        # Python dependencies
└── .gitignore
```

---

## ⚙️ Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/hiffenick/track-expenses-app.git
cd track-expenses-app
```

### 2. Create and activate virtual environment
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
```
SECRET_KEY=your_secret_key_here
DATABASE_URL=sqlite:///expenses.db
```

### 5. Run database migrations
```bash
flask db upgrade
```

### 6. Run the app
```bash
python run.py
```

Visit `http://localhost:5000` in your browser.

---

## 🗃 Database Migrations

This project uses Alembic for schema management. To create a new migration after model changes:

```bash
flask db migrate -m "describe your change"
flask db upgrade
```

---

## 📌 Environment Variables

Create a `.env` file based on this template:

```
SECRET_KEY=your_secret_key
DATABASE_URL=sqlite:///expenses.db
```

> ⚠️ Never commit your `.env` file. It is already listed in `.gitignore`.

---

## 🙋‍♂️ Author

**Nikhil** — [@hiffenick](https://github.com/hiffenick)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).