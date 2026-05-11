from flask import Flask
from src.__init__ import createapp

app = createapp()
if __name__ == '__main__':
    app.run(debug=True)