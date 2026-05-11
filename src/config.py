import os
import pyodbc
from urllib.parse import quote_plus
from dotenv import load_dotenv
load_dotenv()

class Config:
    #DATABASE_CREDENTIALS 
    DB_USER = os.getenv("DB_USER")
    DB_SERVER = os.getenv("DB_SERVER")
    DB_PASS_RAW = os.getenv("DB_PASS")
    DB_PASS = quote_plus(DB_PASS_RAW)
    DB_NAME = os.getenv("DB_NAME")

    #SECREAT_KEY
    SECRET_KEY = os.getenv("SECRET_KEY")
    
    #GMAIL_OTP_GENERATING_CREDENTIALS
    MAIL_SERVER = os.getenv("MAIL_SERVER")
    MAIL_PORT = int(os.getenv("MAIL_PORT"))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS").lower() in ['true' , '1' , 'yes']
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER")
    
    #DATABASE_CONNECTION_STRING
    SQLALCHEMY_DATABASE_URI = (
        f"mssql+pyodbc://{DB_USER}:{DB_PASS}@{DB_SERVER}/{DB_NAME}"
        "?driver=ODBC+Driver+17+for+SQL+Server"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
