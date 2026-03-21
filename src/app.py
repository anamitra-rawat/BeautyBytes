import json
import os
from dotenv import load_dotenv
from flask import Flask

load_dotenv()
from flask_cors import CORS
from models import db, Product
from routes import register_routes

# src/ directory and project root (one level up)
current_directory = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_directory)

# Serve React build files from <project_root>/frontend/dist
app = Flask(__name__,
    static_folder=os.path.join(project_root, 'frontend', 'dist'),
    static_url_path='')
CORS(app)


app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database with app
db.init_app(app)

# Register routes
register_routes(app)

# Function to initialize database, change this to your own database initialization logic
def init_db():
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Initialize database with data from init.json if empty
        if Product.query.count() == 0:
            json_file_path = os.path.join(current_directory, 'init.json')
            with open(json_file_path, 'r') as file:
                data = json.load(file)
                for p in data['products']:
                    product = Product(
                        id=p['id'],
                        original_id=str(p.get('original_id', '')),
                        name=p['name'],
                        brand=p['brand'],
                        category=p['category'],
                        price=p['price'],
                        rating=p.get('rating'),
                        num_reviews=p.get('num_reviews'),
                        details=p.get('details', ''),
                        ingredients=p.get('ingredients', ''),
                        url=p.get('url', ''),
                        size=p.get('size', ''),
                        online_only=p.get('online_only', False),
                    )
                    db.session.add(product)
            
            db.session.commit()
            print("Database initialized with Sephora products")

init_db()

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5001)
