"""
LLM chat route with RAG — only loaded when USE_LLM = True in routes.py.

RAG pipeline:
  1. User sends a question via POST /api/chat
  2. The LLM transforms the question into an optimized search query
  3. The IR system (TF-IDF + SVD) retrieves relevant products
  4. Retrieved products are formatted as context and sent to the LLM
  5. The LLM answers grounded in the retrieved products
  6. Both the IR results and the LLM answer are streamed to the frontend

Setup:
  1. Add API_KEY=your_key to .env
  2. Set USE_LLM = True in routes.py
"""
import json
import os
import logging
from flask import request, jsonify, Response, stream_with_context
from infosci_spark_client import LLMClient

logger = logging.getLogger(__name__)


def transform_query_for_search(client, user_message):
    """Use the LLM to transform the user's natural language question into an
    optimized search query for our product IR system.

    This is the 'query modification' step from the RAG demo — the LLM rewrites
    the user's conversational question into keywords that will retrieve the most
    relevant products from the TF-IDF + SVD search index.

    Args:
        client: LLMClient instance.
        user_message: The user's original chat message.

    Returns:
        str: An optimized search query string for the IR system.
    """
    messages = [
        {
            "role": "system",
            "content": (
                "You are a search query optimizer for a beauty product catalog (Sephora products). "
                "Your job is to transform the user's question into the best possible search query "
                "for a TF-IDF based product search engine.\n\n"
                "Rules:\n"
                "- Output ONLY the search query, nothing else\n"
                "- Include relevant product type keywords (e.g. moisturizer, serum, lipstick)\n"
                "- Include relevant ingredient or attribute keywords\n"
                "- Include skin concern keywords if mentioned\n"
                "- Keep it concise — 3 to 10 words\n"
                "- Do NOT include explanations, quotes, or extra text\n\n"
                "Examples:\n"
                "User: 'What's the best thing for wrinkles?'\n"
                "Query: anti-aging serum retinol wrinkle cream\n\n"
                "User: 'I have oily skin and need something for my pores'\n"
                "Query: oily skin pore minimizing cleanser mattifying\n\n"
                "User: 'recommend a red lipstick for a fancy event'\n"
                "Query: red lipstick long-wear bold pigment"
            ),
        },
        {"role": "user", "content": user_message},
    ]
    response = client.chat(messages, stream=False, show_thinking=False)
    query = (response.get("content") or "").strip()
    logger.info(f"LLM transformed query: '{user_message}' -> '{query}'")
    return query


def format_product_context(products):
    """Format retrieved products as a rich Markdown context string for the LLM.

    Similar to format_rag_context in the class demo, but adapted for products.

    Args:
        products: List of product dicts from search_products().

    Returns:
        str: Formatted context string with product details.
    """
    if not products:
        return "No matching products found in the catalog."

    parts = []
    for i, p in enumerate(products, 1):
        section = (
            f"### [{i}] {p['name']}\n"
            f"- **Brand:** {p['brand']}\n"
            f"- **Category:** {p['category']}\n"
            f"- **Price:** ${p['price']:.2f}\n"
            f"- **Rating:** {p.get('rating') or 'N/A'}"
        )
        if p.get('num_reviews'):
            section += f" ({p['num_reviews']} reviews)"
        section += "\n"
        if p.get('details'):
            section += f"- **Details:** {p['details']}\n"
        if p.get('ingredients'):
            section += f"- **Key Ingredients:** {p['ingredients']}\n"
        if p.get('score') is not None:
            section += f"- **Relevance Score:** {p['score']:.4f}\n"
        parts.append(section)

    return "\n---\n\n".join(parts)


def register_chat_route(app, search_products_fn):
    """Register the /api/chat SSE endpoint with full RAG pipeline.

    Args:
        app: Flask app instance.
        search_products_fn: The search_products function from routes.py (our IR system).
    """

    @app.route("/api/chat", methods=["POST"])
    def chat():
        data = request.get_json() or {}
        user_message = (data.get("message") or "").strip()
        if not user_message:
            return jsonify({"error": "Message is required"}), 400

        api_key = os.getenv("API_KEY")
        if not api_key:
            return jsonify({"error": "API_KEY not set — add it to your .env file"}), 500

        client = LLMClient(api_key=api_key)

        def generate():
            # Step 1: LLM transforms user question into a search query
            try:
                search_query = transform_query_for_search(client, user_message)
            except Exception as e:
                logger.error(f"Query transformation error: {e}")
                search_query = user_message  # Fallback: use original message

            # Send the generated search query to the frontend
            yield f"data: {json.dumps({'search_query': search_query})}\n\n"

            # Step 2: IR system retrieves products
            try:
                search_result = search_products_fn(query=search_query, top_k=8)
                products = search_result.get("results", [])
            except Exception as e:
                logger.error(f"Search error: {e}")
                products = []

            # Send the full IR results to the frontend (so they display as cards)
            yield f"data: {json.dumps({'search_results': products})}\n\n"

            # Step 3: Format products as context for the LLM
            context_text = format_product_context(products)

            # Step 4: RAG generation, LLM answers using retrieved products
            rag_system = (
                "You are a helpful BeautyBytes beauty assistant. "
                "Answer the user's question using ONLY the product information provided below. "
                "If the products don't contain enough information to answer, say so. "
                "When recommending products, mention them by name, brand, and price. "
                "Be concise, friendly, and helpful."
            )

            prompt = [
                {"role": "system", "content": rag_system},
                {
                    "role": "user",
                    "content": (
                        f"Retrieved products from our catalog:\n\n{context_text}\n\n"
                        f"---\n\n"
                        f"User question: {user_message}"
                    ),
                },
            ]

            try:
                for chunk in client.chat(prompt, stream=True, show_thinking=False):
                    if chunk.get("content"):
                        yield f"data: {json.dumps({'content': chunk['content']})}\n\n"
            except Exception as e:
                logger.error(f"LLM streaming error: {e}")
                yield f"data: {json.dumps({'error': 'LLM streaming error occurred'})}\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
