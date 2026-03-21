from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    original_id = db.Column(db.String(32))
    name = db.Column(db.String(256), nullable=False)
    brand = db.Column(db.String(128), nullable=False)
    category = db.Column(db.String(128), nullable=False)
    price = db.Column(db.Float, nullable=False)
    rating = db.Column(db.Float)
    num_reviews = db.Column(db.Integer)
    details = db.Column(db.Text)
    ingredients = db.Column(db.Text)
    url = db.Column(db.String(512))
    size = db.Column(db.String(128))
    online_only = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'brand': self.brand,
            'category': self.category,
            'price': self.price,
            'rating': self.rating,
            'num_reviews': self.num_reviews,
            'details': self.details,
            'ingredients': self.ingredients,
            'url': self.url,
            'size': self.size,
            'online_only': self.online_only,
        }

    def __repr__(self):
        return f'<Product {self.id}: {self.name}>'