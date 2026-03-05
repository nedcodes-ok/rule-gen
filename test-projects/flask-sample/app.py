from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
db = SQLAlchemy(app)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email
        }


@app.route('/')
def index():
    return jsonify({'message': 'Hello World'})


@app.route('/users')
def users():
    all_users = User.query.all()
    return jsonify([u.to_dict() for u in all_users])


if __name__ == '__main__':
    app.run(debug=True)
