"""
Routes: React app serving and product search API.

Search pipeline:
  1. TF-IDF vectorization of product documents (name, brand, category, details, ingredients)
  2. SVD (Truncated) for Latent Semantic Analysis — captures semantic similarity
  3. Situational query expansion — maps contextual phrases to product-relevant terms
  4. Cosine similarity in the reduced SVD space
  5. Score threshold filtering — only returns meaningfully relevant results

To enable AI chat, set USE_LLM = True below. See llm_routes.py for AI code.
"""

import json
import os
from flask import send_from_directory, request, jsonify
from models import db, Product
import math
import re
from collections import Counter
import numpy as np

# ── AI toggle ────────────────────────────────────────────────────────────────
USE_LLM = False
# USE_LLM = True
# ─────────────────────────────────────────────────────────────────────────────

STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "this", "that", "these", "those",
    "it", "its", "by", "from", "as", "into", "through", "during", "before",
    "after", "above", "below", "between", "not", "no", "nor", "so", "yet",
    "both", "either", "each", "few", "more", "most", "other", "some",
    "such", "than", "too", "very", "can", "just", "also", "looking",
    "want", "need", "good", "best", "great", "nice", "like", "get",
    "something", "thing", "things", "look", "make", "event",
}

# ── Situational query expansion ──────────────────────────────────────────────
# Maps contextual/situational phrases to product-relevant terms that actually
# appear in product names, details, and ingredients. This bridges the gap
# between how users *describe what they want* and how products are *described*.
SITUATIONAL_EXPANSIONS = {
    # Event / occasion contexts
    "red carpet":       ["luxe", "long-wear", "bold", "shimmer", "satin", "matte", "full", "coverage", "pigment", "rich", "velvet"],
    "date night":       ["sultry", "long-wear", "fragrance", "glow", "shimmer", "subtle", "rose", "warm", "soft"],
    "wedding":          ["long-wear", "waterproof", "natural", "radiant", "dewy", "luminous", "soft", "lasting", "gentle"],
    "party":            ["glitter", "shimmer", "bold", "sparkle", "long-wear", "vibrant", "metallic", "pigment"],
    "office":           ["natural", "subtle", "lightweight", "matte", "neutral", "nude", "soft", "sheer"],
    "everyday":         ["natural", "lightweight", "sheer", "nude", "soft", "gentle", "light"],
    "beach":            ["waterproof", "sunscreen", "spf", "lightweight", "natural", "bronzer", "sun", "water"],
    "festival":         ["glitter", "bold", "sparkle", "vibrant", "shimmer", "color", "bright"],
    "prom":             ["sparkle", "shimmer", "long-wear", "radiant", "glow", "luminous"],
    "interview":        ["natural", "neutral", "matte", "subtle", "soft", "nude", "clean"],
    "brunch":           ["natural", "dewy", "glow", "light", "fresh", "soft", "sheer"],

    # Style / aesthetic contexts
    "glam":             ["shimmer", "bold", "sparkle", "dramatic", "luxe", "metallic", "full", "coverage", "pigment", "rich"],
    "glam look":        ["shimmer", "bold", "sparkle", "dramatic", "luxe", "metallic", "pigment", "rich"],
    "natural look":     ["natural", "sheer", "lightweight", "dewy", "nude", "tinted", "soft", "light"],
    "no makeup":        ["natural", "sheer", "tinted", "lightweight", "nude", "soft", "light", "bare"],
    "dewy":             ["dewy", "glow", "luminous", "radiant", "hydrating", "moisture"],
    "matte look":       ["matte", "oil", "free", "long-wear", "velvet", "powder", "shine"],
    "smokey eye":       ["eyeshadow", "dark", "smoky", "blend", "dramatic", "charcoal", "black", "palette", "shadow"],
    "bold lip":         ["lipstick", "vibrant", "pigment", "matte", "red", "berry", "color", "rich"],
    "soft glam":        ["neutral", "shimmer", "natural", "warm", "bronze", "peach", "subtle", "glow"],
    "glass skin":       ["hydrating", "dewy", "serum", "luminous", "glow", "moisturizer", "radiant", "water"],
    "clean girl":       ["natural", "dewy", "sheer", "lightweight", "nude", "subtle", "tinted", "balm"],

    # Skin concern contexts
    "acne":             ["salicylic", "acid", "oil", "free", "blemish", "clear", "pore", "clean", "gel"],
    "anti aging":       ["retinol", "peptide", "collagen", "firming", "wrinkle", "renewal", "repair", "serum"],
    "anti-aging":       ["retinol", "peptide", "collagen", "firming", "wrinkle", "renewal", "repair", "serum"],
    "dry skin":         ["hydrating", "moisturizing", "nourishing", "cream", "hyaluronic", "rich", "butter", "oil", "balm"],
    "oily skin":        ["oil", "free", "matte", "lightweight", "gel", "pore", "shine", "control", "salicylic"],
    "sensitive skin":   ["gentle", "fragrance", "free", "soothing", "calming", "aloe", "soft", "mild"],
    "dark spots":       ["vitamin", "brightening", "niacinamide", "radiance", "tone", "even", "serum"],
    "sun protection":   ["spf", "sunscreen", "broad", "spectrum", "sun", "protection", "uv"],
    "redness":          ["calming", "soothing", "green", "gentle", "aloe", "sensitive", "repair"],

    # Seasonal contexts
    "summer":           ["lightweight", "spf", "waterproof", "bronzer", "glow", "fresh", "dewy", "sun", "water"],
    "winter":           ["hydrating", "rich", "nourishing", "cream", "moisture", "repair", "balm", "butter", "oil"],
    "fall":             ["warm", "berry", "plum", "bronze", "copper", "spice", "deep", "rich"],
    "spring":           ["fresh", "light", "pink", "peach", "natural", "floral", "dewy", "soft"],

    # Fragrance contexts
    "romantic scent":   ["floral", "rose", "jasmine", "soft", "warm", "vanilla", "musk", "parfum", "eau"],
    "romantic":         ["floral", "rose", "jasmine", "soft", "warm", "vanilla", "musk", "parfum"],
    "fresh scent":      ["citrus", "clean", "aquatic", "green", "light", "crisp", "bergamot", "fresh"],
    "sexy":             ["musk", "amber", "oud", "warm", "spicy", "sensual", "vanilla", "noir", "intense"],
    "masculine":        ["woody", "cedar", "vetiver", "leather", "tobacco", "spice", "oud", "homme"],
    "floral":           ["rose", "jasmine", "peony", "lily", "floral", "blossom", "petal", "garden"],
}


# ── Skin concern ingredient rules ────────────────────────────────────────────
# Each concern has:
#   "boost": ingredients/terms that are GOOD for this concern (score boosted)
#   "penalize": ingredients/terms that are BAD for this concern (score reduced)
SKIN_CONCERNS = {
    "acne": {
        "boost": ["salicylic", "benzoyl", "niacinamide", "tea tree", "zinc",
                  "clay", "charcoal", "bha", "aha", "glycolic", "non-comedogenic",
                  "oil-free", "pore", "blemish", "clear", "clean", "purifying"],
        "penalize": ["coconut oil", "cocoa butter", "lanolin", "heavy",
                     "rich", "thick", "buttery", "petroleum", "mineral oil"],
    },
    "dry_skin": {
        "boost": ["hyaluronic", "ceramide", "glycerin", "shea", "squalane",
                  "jojoba", "avocado", "argan", "moisturizing", "hydrating",
                  "nourishing", "cream", "butter", "balm", "oil", "rich",
                  "emollient", "barrier"],
        "penalize": ["alcohol denat", "witch hazel", "mattifying", "oil-free",
                     "astringent", "salicylic", "benzoyl"],
    },
    "oily_skin": {
        "boost": ["salicylic", "niacinamide", "clay", "charcoal", "zinc",
                  "mattifying", "matte", "oil-free", "lightweight", "gel",
                  "pore", "shine", "control", "bha", "tea tree"],
        "penalize": ["coconut oil", "shea butter", "rich", "heavy", "thick",
                     "buttery", "cream", "oil", "petroleum"],
    },
    "sensitive": {
        "boost": ["aloe", "chamomile", "oat", "centella", "cica", "allantoin",
                  "gentle", "soothing", "calming", "fragrance-free", "hypoallergenic",
                  "mild", "soft", "barrier", "ceramide"],
        "penalize": ["fragrance", "parfum", "alcohol denat", "retinol", "glycolic",
                     "aha", "bha", "essential oil", "menthol", "eucalyptus"],
    },
    "aging": {
        "boost": ["retinol", "retinal", "peptide", "collagen", "vitamin c",
                  "ascorbic", "niacinamide", "hyaluronic", "resveratrol",
                  "firming", "anti-aging", "renewal", "repair", "wrinkle",
                  "elastin", "antioxidant", "coq10"],
        "penalize": [],
    },
    "dark_spots": {
        "boost": ["vitamin c", "ascorbic", "niacinamide", "arbutin", "kojic",
                  "tranexamic", "azelaic", "licorice", "brightening",
                  "dark spot", "radiance", "even tone", "luminous", "glow"],
        "penalize": [],
    },
    "redness": {
        "boost": ["centella", "cica", "aloe", "chamomile", "green tea",
                  "niacinamide", "azelaic", "oat", "allantoin", "calming",
                  "soothing", "anti-redness", "gentle", "barrier", "ceramide"],
        "penalize": ["retinol", "glycolic", "aha", "fragrance", "alcohol denat",
                     "menthol", "peppermint", "eucalyptus", "essential oil"],
    },
}

CONCERN_BOOST_WEIGHT = 0.15    # How much to boost score for good ingredients
CONCERN_PENALIZE_WEIGHT = 0.10 # How much to reduce score for bad ingredients

_search_index = None

# ── SVD configuration ────────────────────────────────────────────────────────
SVD_NUM_COMPONENTS = 100  # Number of latent dimensions to keep
SCORE_THRESHOLD = 0.05    # Minimum similarity score to include in results


def tokenize(text):
    if not text:
        return []
    tokens = re.findall(r"[a-z]+", text.lower())
    return [t for t in tokens if t not in STOPWORDS and len(t) > 1]


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


def expand_query(query_text):
    """Expand a situational query by injecting related product terms.

    Checks the query for known situational phrases and appends relevant
    product-vocabulary terms. The original query terms are preserved so
    exact matches still score highly, but the expansion lets the SVD
    space pick up on latent connections.

    Returns (expanded_query_string, list_of_expansion_labels_matched)
    """
    if not query_text:
        return query_text, []

    lower_query = query_text.lower()
    expansion_terms = []
    matched_labels = []

    # Check for multi-word phrases first (longer phrases take priority)
    for phrase, terms in sorted(SITUATIONAL_EXPANSIONS.items(), key=lambda x: -len(x[0])):
        if phrase in lower_query:
            expansion_terms.extend(terms)
            matched_labels.append(phrase)

    if expansion_terms:
        # Deduplicate while preserving order
        seen = set()
        unique_terms = []
        for t in expansion_terms:
            if t not in seen:
                seen.add(t)
                unique_terms.append(t)
        # Append expansion terms to the original query
        return query_text + " " + " ".join(unique_terms), matched_labels

    return query_text, []


def build_search_index(products):
    """Build TF-IDF matrix then apply truncated SVD for LSA."""
    documents = [product_document_tokens(p) for p in products]
    num_docs = len(documents)

    # ── Build vocabulary ──────────────────────────────────────────────────
    doc_freq = Counter()
    for tokens in documents:
        doc_freq.update(set(tokens))

    vocab = {term: idx for idx, term in enumerate(sorted(doc_freq.keys()))}
    vocab_size = len(vocab)

    # ── IDF vector ────────────────────────────────────────────────────────
    idf = np.ones(vocab_size)
    for term, idx in vocab.items():
        idf[idx] = math.log((num_docs + 1) / (doc_freq[term] + 1)) + 1

    # ── TF-IDF matrix  (num_docs x vocab_size) ───────────────────────────
    tfidf_matrix = np.zeros((num_docs, vocab_size))
    for doc_id, tokens in enumerate(documents):
        term_counts = Counter(tokens)
        total_terms = len(tokens) or 1
        for term, count in term_counts.items():
            if term in vocab:
                col = vocab[term]
                tfidf_matrix[doc_id, col] = (count / total_terms) * idf[col]

    # L2-normalize each row
    row_norms = np.linalg.norm(tfidf_matrix, axis=1, keepdims=True)
    row_norms[row_norms == 0] = 1.0
    tfidf_matrix /= row_norms

    # ── Truncated SVD ─────────────────────────────────────────────────────
    k = min(SVD_NUM_COMPONENTS, min(tfidf_matrix.shape) - 1)
    if k < 1:
        k = 1

    U, S, Vt = np.linalg.svd(tfidf_matrix, full_matrices=False)
    U_k = U[:, :k]
    S_k = S[:k]
    Vt_k = Vt[:k, :]

    # Document vectors in reduced space: U_k * diag(S_k)
    doc_vectors_svd = U_k * S_k[np.newaxis, :]

    # L2-normalize document vectors in SVD space
    doc_norms = np.linalg.norm(doc_vectors_svd, axis=1, keepdims=True)
    doc_norms[doc_norms == 0] = 1.0
    doc_vectors_svd /= doc_norms

    # Also keep original tfidf for keyword matching info
    return {
        "vocab": vocab,
        "idf": idf,
        "tfidf_matrix": tfidf_matrix,
        "doc_vectors_svd": doc_vectors_svd,
        "S_k": S_k,
        "Vt_k": Vt_k,
        "num_docs": num_docs,
    }


def build_query_vector_svd(query_text, index):
    """Project a query into the SVD latent space.

    Returns (q_svd_vector, expanded_query_string, matched_expansion_labels, query_tokens_in_vocab)
    """
    expanded, matched_labels = expand_query(query_text)
    tokens = tokenize(expanded) if expanded else []
    if not tokens:
        return None, query_text, [], []

    vocab = index["vocab"]
    idf = index["idf"]
    Vt_k = index["Vt_k"]

    # Track which query tokens actually exist in the vocabulary
    tokens_in_vocab = [t for t in set(tokens) if t in vocab]

    # Build TF-IDF vector for query
    query_tfidf = np.zeros(len(vocab))
    term_counts = Counter(tokens)
    total_terms = len(tokens)
    for term, count in term_counts.items():
        if term in vocab:
            col = vocab[term]
            query_tfidf[col] = (count / total_terms) * idf[col]

    norm = np.linalg.norm(query_tfidf)
    if norm > 0:
        query_tfidf /= norm

    # Project into SVD space
    q_svd = query_tfidf @ Vt_k.T

    q_norm = np.linalg.norm(q_svd)
    if q_norm > 0:
        q_svd /= q_norm

    return q_svd, expanded, matched_labels, tokens_in_vocab


def find_matched_keywords(product, query_tokens_in_vocab):
    """Find which query tokens appear in a product's text fields."""
    if not query_tokens_in_vocab:
        return []

    product_text = " ".join([
        product.name or "",
        product.brand or "",
        product.category or "",
        product.details or "",
        product.ingredients or "",
    ]).lower()

    product_token_set = set(re.findall(r"[a-z]+", product_text))
    matched = [t for t in query_tokens_in_vocab if t in product_token_set]
    return matched


def compute_concern_adjustment(product, skin_concerns):
    """Compute a score adjustment based on skin concerns.

    Returns (adjustment_float, list_of_good_matches, list_of_bad_matches)
    """
    if not skin_concerns:
        return 0.0, [], []

    product_text = " ".join([
        product.name or "",
        product.details or "",
        product.ingredients or "",
    ]).lower()

    total_boost = 0.0
    total_penalty = 0.0
    good_matches = []
    bad_matches = []

    for concern in skin_concerns:
        rules = SKIN_CONCERNS.get(concern)
        if not rules:
            continue

        for term in rules["boost"]:
            if term.lower() in product_text:
                total_boost += CONCERN_BOOST_WEIGHT
                if term not in good_matches:
                    good_matches.append(term)

        for term in rules["penalize"]:
            if term.lower() in product_text:
                total_penalty += CONCERN_PENALIZE_WEIGHT
                if term not in bad_matches:
                    bad_matches.append(term)

    # Cap the boost/penalty so they don't overwhelm the SVD score
    adjustment = min(total_boost, 0.4) - min(total_penalty, 0.3)
    return adjustment, good_matches, bad_matches


def search_products(
    query,
    category_filter=None,
    min_price=None,
    max_price=None,
    min_rating=None,
    skin_concerns=None,
    top_k=20,
):
    global _search_index

    # Empty query with no filters = return nothing
    has_concerns = skin_concerns and len(skin_concerns) > 0
    if not query and not category_filter and min_price is None and max_price is None and min_rating is None and not has_concerns:
        return {"results": [], "query_info": {}}

    if _search_index is None:
        all_products = Product.query.all()
        _search_index = {
            "index": build_search_index(all_products),
            "products": all_products,
        }

    products = _search_index["products"]
    index = _search_index["index"]

    query_info = {
        "original_query": query or "",
        "expanded_query": "",
        "expansion_labels": [],
        "vocab_tokens": [],
        "skin_concerns": skin_concerns or [],
    }

    if query:
        q_svd, expanded, matched_labels, tokens_in_vocab = build_query_vector_svd(query, index)
        query_info["expanded_query"] = expanded
        query_info["expansion_labels"] = matched_labels
        query_info["vocab_tokens"] = tokens_in_vocab
    else:
        q_svd = None

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

        if q_svd is not None:
            score = float(np.dot(q_svd, index["doc_vectors_svd"][doc_id]))
            # Apply strict threshold — skip products with very low relevance
            if score < SCORE_THRESHOLD:
                continue
            matched_kw = find_matched_keywords(product, query_info["vocab_tokens"])
        else:
            score = 1.0
            matched_kw = []

        # Apply skin concern adjustments
        concern_adj, good_ingredients, bad_ingredients = compute_concern_adjustment(
            product, skin_concerns
        )
        adjusted_score = score + concern_adj

        results.append((adjusted_score, score, product, matched_kw, good_ingredients, bad_ingredients))

    results.sort(key=lambda x: (-x[0], -(x[2].rating or 0)))

    serialized = [
        {
            **p.to_dict(),
            "score": round(adj_score, 4),
            "base_score": round(base_score, 4),
            "matched_keywords": matched_kw,
            "good_ingredients": good_ing,
            "bad_ingredients": bad_ing,
        }
        for adj_score, base_score, p, matched_kw, good_ing, bad_ing in results
    ]

    if top_k is not None:
        serialized = serialized[:top_k]

    return {"results": serialized, "query_info": query_info}


def get_categories():
    rows = (
        db.session.query(Product.category).distinct().order_by(Product.category).all()
    )
    return sorted([r[0] for r in rows])


def invalidate_index():
    global _search_index
    _search_index = None


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
        skin_concerns_raw = request.args.get("skin_concerns", "").strip()
        skin_concerns = [c.strip() for c in skin_concerns_raw.split(",") if c.strip()] or None

        page = max(request.args.get("page", default=1, type=int), 1)
        per_page = request.args.get("per_page", default=20, type=int)
        per_page = min(max(per_page, 1), 100)

        search_result = search_products(
            query=query,
            category_filter=category,
            min_price=min_price,
            max_price=max_price,
            min_rating=min_rating,
            skin_concerns=skin_concerns,
            top_k=None,
        )

        all_results = search_result["results"][:50]
        query_info = search_result["query_info"]

        start = (page - 1) * per_page
        end = start + per_page
        total = len(all_results)
        paginated = all_results[start:end]

        return jsonify(
            {
                "results": paginated,
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": math.ceil(total / per_page) if per_page else 0,
                "query_info": query_info,
            }
        )

    @app.route("/api/products/<int:product_id>")
    def product_detail(product_id):
        product = Product.query.get_or_404(product_id)
        return jsonify(product.to_dict())

    if USE_LLM:
        from llm_routes import register_chat_route

        register_chat_route(app, search_products)