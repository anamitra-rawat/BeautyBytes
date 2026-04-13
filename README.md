# BeautyBytes

BeautyBytes is a Flask + React app for searching Sephora products using SVD-powered semantic search with situational query expansion.

## Features

- **SVD (Latent Semantic Analysis)**: TF-IDF vectors are reduced via truncated SVD so semantically related products surface even without exact keyword matches
- **Situational Query Expansion**: Understands context like "red carpet", "date night", "oily skin", "glam look" and expands queries with relevant product terms
- **Relevance Scores**: Each result shows a similarity percentage and matched keywords
- **Filters**: Category, price range, and minimum rating

## Setup

### 1. Clone the repo

```
git clone https://github.com/anamitra-rawat/BeautyBytes.git
cd BeautyBytes
```

### 2. Activate the conda environment

```
conda activate INFO4300
```

### 3. Install backend dependencies

```
pip install -r requirements.txt
```

### 4. Start the backend

```
python src/app.py
```

Backend runs at `http://localhost:5001`.

### 5. Start the frontend (new terminal)

```
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### 6. Open in browser

Go to `http://localhost:5173`

## Example searches

- `lipstick for a red carpet event`
- `eyeshadow for a glam look`
- `moisturizer for dry skin`
- `perfume for a date night`
- `foundation for oily skin`
- `anti-aging serum`

## Rebuilding the database

If you need to reset the database, delete it and restart:

```
rm -f src/instance/data.db
python src/app.py
```

## Project layout

- `src/app.py` — Flask app and database setup
- `src/routes.py` — SVD search engine, query expansion, and API routes
- `src/models.py` — SQLAlchemy models
- `src/init.json` — seed data
- `frontend/src/App.tsx` — main UI
- `frontend/src/types.ts` — TypeScript interfaces
- `frontend/src/App.css` — styles
- `frontend/src/Chat.tsx` — optional chat UI

## Docker

```
docker build -t beautybytes .
docker run -p 5000:5000 beautybytes
```