"""
Routes: React app serving and episode search API.

To enable AI chat, set USE_LLM = True below. See llm_routes.py for AI code.
"""

import json
import os
from flask import send_from_directory, request, jsonify
from models import db, Product
import math
import re
from collections import Counter

# ── AI toggle ────────────────────────────────────────────────────────────────
USE_LLM = False
# USE_LLM = True
# ─────────────────────────────────────────────────────────────────────────────

STOPWORDS = {
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "shall",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "by",
    "from",
    "as",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "between",
    "not",
    "no",
    "nor",
    "so",
    "yet",
    "both",
    "either",
    "each",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "than",
    "too",
    "very",
    "can",
    "just",
    "also",
}

_tfidf_index = None


def tokenize(text):
    if not text:
        return []
    tokens = re.findall(r"[a-z]+", text.lower())
    return [t for t in tokens if t not in STOPWORDS and len(t) > 2]


def product_document_tokens(product):
    weighted_fields = [
        (product.name, 3),
        (product.brand, 1),
        (product.category, 2),
        (product.details or "", 1),
        (product.ingredients or "", 1),
    ]
    tokens = []
    for text, weight in weighted_fields:
        field_tokens = tokenize(text)
        if field_tokens:
            tokens.extend(field_tokens * weight)
    return tokens


def build_document_corpus(products):
    return [product_document_tokens(product) for product in products]


def compute_document_frequencies(documents):
    doc_freq = Counter()
    for tokens in documents:
        doc_freq.update(set(tokens))
    return doc_freq


def compute_idf(doc_freq, num_docs):
    return {
        term: math.log((num_docs + 1) / (freq + 1)) + 1
        for term, freq in doc_freq.items()
    }


def compute_document_vectors(documents, idf):
    vectors = []
    for tokens in documents:
        term_counts = Counter(tokens)
        total_terms = len(tokens) or 1
        vector = {}
        for term, count in term_counts.items():
            vector[term] = (count / total_terms) * idf.get(term, 1.0)
        norm = math.sqrt(sum(weight * weight for weight in vector.values())) or 1.0
        vectors.append({term: weight / norm for term, weight in vector.items()})
    return vectors


def build_query_vector(query, idf):
    query_tokens = tokenize(query) if query else []
    if not query_tokens:
        return {}

    query_term_counts = Counter(query_tokens)
    total_terms = len(query_tokens)
    query_vector = {}
    for term, count in query_term_counts.items():
        query_vector[term] = (count / total_terms) * idf.get(term, 1.0)

    norm = math.sqrt(sum(weight * weight for weight in query_vector.values())) or 1.0
    return {term: weight / norm for term, weight in query_vector.items()}


def build_tfidf_index(products):
    documents = build_document_corpus(products)
    num_docs = len(documents)
    doc_freq = compute_document_frequencies(documents)
    idf = compute_idf(doc_freq, num_docs)
    vectors = compute_document_vectors(documents, idf)
    return {
        "vectors": vectors,
        "idf": idf,
        "df": doc_freq,
        "N": num_docs,
    }


def cosine_sim(query_vec, doc_vec):
    score = 0.0
    for term, query_weight in query_vec.items():
        if term in doc_vec:
            score += query_weight * doc_vec[term]
    return score


def search_products(
    query,
    category_filter=None,
    min_price=None,
    max_price=None,
    min_rating=None,
    top_k=20,
):
    global _tfidf_index

    if _tfidf_index is None:
        all_products = Product.query.all()
        _tfidf_index = {
            "index": build_tfidf_index(all_products),
            "products": all_products,
        }

    products = _tfidf_index["products"]
    index = _tfidf_index["index"]
    query_vector = build_query_vector(query, index["idf"])

    results = []
    for doc_id, product in enumerate(products):
        if category_filter and category_filter.lower() not in product.category.lower():
            continue
        if min_price is not None and product.price < min_price:
            continue
        if max_price is not None and product.price > max_price:
            continue
        if min_rating is not None and (product.rating or 0) < min_rating:
            continue

        score = (
            cosine_sim(query_vector, index["vectors"][doc_id]) if query_vector else 1.0
        )
        results.append((score, product))

    results.sort(key=lambda x: (-x[0], -(x[1].rating or 0)))

    serialized = [{**p.to_dict(), "score": round(score, 4)} for score, p in results]

    if top_k is not None:
        return serialized[:top_k]
    return serialized


def get_categories():
    rows = (
        db.session.query(Product.category).distinct().order_by(Product.category).all()
    )
    return sorted([r[0] for r in rows])


def invalidate_index():
    global _tfidf_index
    _tfidf_index = None


def register_routes(app):
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve(path):
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, "index.html")

    @app.route("/api/config")
    def config():
        return jsonify({"use_llm": USE_LLM})

    @app.route("/api/categories")
    def categories():
        return jsonify(get_categories())

    @app.route("/api/search")
    def search():
        query = request.args.get("q", "").strip()
        category = request.args.get("category", "").strip() or None
        min_price = request.args.get("min_price", type=float)
        max_price = request.args.get("max_price", type=float)
        min_rating = request.args.get("min_rating", type=float)

        # code to add multiple pages for options

        page = max(request.args.get("page", default=1, type=int), 1)
        per_page = 20
        per_page = request.args.get("per_page", default=20, type=int)
        per_page = min(max(per_page, 1), 100)

        results = search_products(
            query=query,
            category_filter=category,
            min_price=min_price,
            max_price=max_price,
            min_rating=min_rating,
            top_k=None,  # large number so we can paginate
        )
        results = results[:50]
        start = (page - 1) * per_page
        end = start + per_page
        total = len(results)

        paginated = results[start:end]

        return jsonify(
            {
                "results": paginated,
                "total": len(results),
                "page": page,
                "per_page": per_page,
                "total_pages": math.ceil(total / per_page) if per_page else 0,
            }
        )

    @app.route("/api/products/<int:product_id>")
    def product_detail(product_id):
        product = Product.query.get_or_404(product_id)
        return jsonify(product.to_dict())

    if USE_LLM:
        from llm_routes import register_chat_route

        register_chat_route(app, search_products)
