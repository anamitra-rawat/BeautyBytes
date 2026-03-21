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
    'a','an','the','and','or','but','in','on','at','to','for','of','with',
    'is','are','was','were','be','been','being','have','has','had','do',
    'does','did','will','would','could','should','may','might','shall',
    'this','that','these','those','it','its','by','from','as','into',
    'through','during','before','after','above','below','between',
    'not','no','nor','so','yet','both','either','each','few','more',
    'most','other','some','such','than','too','very','can','just','also'
}

def tokenize(text):
    if not text:
        return []
    tokens = re.findall(r'[a-z]+', text.lower())
    return [t for t in tokens if t not in STOPWORDS and len(t) > 2]

def product_document_tokens(product):
    weighted_fields = [
        (product.name, 3),
        (product.brand, 1),
        (product.category, 2),
        (product.details or '', 1),
        (product.ingredients or '', 1),
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
        'vectors': vectors,
        'idf': idf,
        'df': doc_freq,
        'N': num_docs,
    }

def register_routes(app):
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')

    @app.route("/api/config")
    def config():
        return jsonify({"use_llm": USE_LLM})

    @app.route("/api/episodes")
    def episodes_search():
        text = request.args.get("title", "")
        return jsonify(json_search(text))

    if USE_LLM:
        from llm_routes import register_chat_route
        register_chat_route(app, json_search)
