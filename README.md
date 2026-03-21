# BeautyBytes

BeautyBytes is a Flask + React app for searching Sephora products.

## Local setup

Backend:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python src/app.py
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.
Backend runs at `http://localhost:5001`.

## Project layout

- `src/app.py`: Flask app and database setup
- `src/routes.py`: product search routes
- `src/models.py`: SQLAlchemy models
- `src/init.json`: seed data
- `frontend/src/App.tsx`: main UI
- `frontend/src/Chat.tsx`: optional chat UI

## Search

The backend ranks products with TF-IDF and cosine similarity over product name, brand, category, details, and ingredients.

## Data

The app seeds SQLite from `src/init.json` the first time it starts.
If you want to rebuild the local database from the seed file, delete `instance/data.db` and start the app again.

## Build

To build the frontend for Flask to serve:

```bash
cd frontend
npm install
npm run build
```

## Docker

```bash
docker build -t beautybytes .
docker run -p 5000:5000 beautybytes
```
