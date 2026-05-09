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

def transform_query_for_search(client, user_message, filters_text=""):
    messages = [
        {
            "role": "system",
            "content": (
                "You are a search query optimizer for a BeautyBytes product catalog. "
                "Transform the user's input into the most precise, distinctive search query for an IR engine.\n"
                "Rules:\n"
                "- Output ONLY the search query, nothing else (3-10 words)\n"
                "- Focus on the most unique distinguishing features requested to ensure varied results.\n"
                "- Do not use generic words like 'product', 'makeup', 'good', or 'best'.\n"
                "- Incorporate specific product types, ingredients, and active filters.\n"
                "- Do NOT include explanations."
            ),
        },
        {"role": "user", "content": f"User Input: {user_message}\nActive Filters: {filters_text}"},
    ]
    response = client.chat(messages, stream=False, show_thinking=False)
    query = (response.get("content") or "").strip()
    return query

def format_product_context(products):
    if not products:
        return "No matching products found."
    parts = []
    for i, p in enumerate(products, 1):
        pid = p.get('id', i)
        section = (
            f"### ID: {pid} | {p['name']} ({p['brand']})\n"
            f"- Price: ${p['price']:.2f} | Rating: {p.get('rating', 'N/A')}\n"
        )
        if p.get('details'): section += f"- Details: {p['details']}\n"
        if p.get('ingredients'): section += f"- Ingredients: {p['ingredients'][:200]}...\n"
        parts.append(section)
    return "\n".join(parts)

def register_chat_route(app, search_products_fn):

    @app.route("/api/clarifying_questions", methods=["POST"])
    def clarifying_questions():
        data = request.get_json() or {}
        query = (data.get("query") or "").strip()

        if not query:
            return jsonify({"questions": []})

        api_key = os.getenv("SPARK_API_KEY")
        if not api_key:
            return jsonify({"error": "SPARK_API_KEY not set"}), 500

        client = LLMClient(api_key=api_key)
        
        prompt = [
            {
                "role": "system",
                "content": (
                    "You are an expert beauty consultant. Analyze the user's search query, which may describe specific situations (e.g., 'a week long vacation in Florida'). "
                    "Determine if you need more information to make a perfect recommendation. "
                    "If the query is already very specific and clear, return an empty array for questions.\n"
                    "If it is vague or situational, ask 1 to 3 clarifying questions. These questions MUST focus ONLY on specific product features (e.g., matte vs dewy finish, fragrance-free, SPF level, texture, coverage level). Do not ask general routine questions.\n"
                    "Each question must have exactly 2-4 predefined options for the user to choose from.\n"
                    "You MUST respond ONLY with a perfectly formatted JSON object with a single key 'questions'. Example:\n"
                    "{\"questions\": [{\"id\": \"q1\", \"text\": \"What finish do you prefer for your foundation?\", \"options\": [\"Matte\", \"Dewy\", \"Natural\"]}]}\n"
                    "Do NOT include markdown formatting like ```json ... ```. Just return the raw JSON object."
                )
            },
            {
                "role": "user",
                "content": f"Search Query: {query}"
            }
        ]
        
        try:
            response = client.chat(prompt, stream=False, show_thinking=False)
            content = (response.get("content") or "").strip()
            
            if content.startswith("```json"): content = content[7:]
            if content.startswith("```"): content = content[3:]
            if content.endswith("```"): content = content[:-3]
            
            data_json = json.loads(content.strip())
            questions = data_json.get("questions", [])
            
            return jsonify({"questions": questions})
        except Exception as e:
            logger.error(f"Infer questions error: {e}")
            return jsonify({"questions": []})

    @app.route("/api/infer_concerns", methods=["POST"])
    def infer_concerns():
        data = request.get_json() or {}
        query = (data.get("query") or "").strip()

        if not query:
            return jsonify({"inferred_concerns": []})

        api_key = os.getenv("SPARK_API_KEY")
        if not api_key:
            return jsonify({"error": "SPARK_API_KEY not set"}), 500

        client = LLMClient(api_key=api_key)
        
        prompt = [
            {
                "role": "system",
                "content": (
                    "You are a beauty expert system. Analyze the user's search query and infer any underlying skin concerns they might be trying to address. "
                    "You MUST respond ONLY with a perfectly formatted JSON object containing exactly two keys:\n"
                    "1. 'inferred_concerns': an array of strings. You may ONLY choose from: 'acne', 'dry_skin', 'oily_skin', 'sensitive', 'aging', 'dark_spots', 'redness'. "
                    "If the query does not strongly imply any of these concerns, return an empty array [].\n"
                    "2. 'reasoning': a string starting with 'AI thinks this because ' followed by a brief explanation of why these concerns were inferred based on the user's query. If no concerns are inferred, set this to an empty string.\n"
                    "Do NOT include markdown formatting like ```json ... ```. Just return the raw JSON object."
                )
            },
            {
                "role": "user",
                "content": f"Search Query: {query}"
            }
        ]
        
        try:
            response = client.chat(prompt, stream=False, show_thinking=False)
            content = (response.get("content") or "").strip()
            
            if content.startswith("```json"): content = content[7:]
            if content.startswith("```"): content = content[3:]
            if content.endswith("```"): content = content[:-3]
            
            inferred_data = json.loads(content.strip())
            
            inferred = inferred_data.get("inferred_concerns", [])
            if not isinstance(inferred, list):
                inferred = []
                
            allowed = {'acne', 'dry_skin', 'oily_skin', 'sensitive', 'aging', 'dark_spots', 'redness'}
            inferred = [c for c in inferred if c in allowed]
            
            reasoning = inferred_data.get("reasoning", "")
            
            return jsonify({"inferred_concerns": inferred, "reasoning": reasoning})
        except Exception as e:
            logger.error(f"Infer concerns error: {e}")
            return jsonify({"inferred_concerns": [], "reasoning": ""})

    @app.route("/api/search_ai", methods=["POST"])
    def search_ai():
        # Unified AI Search Route
        # Takes search query and filters, retrieves products, and asks the LLM
        # to build an overview and provide per-product reasoning.
        # Returns a structured JSON payload synchronously (no streaming).
        data = request.get_json() or {}
        user_message = (data.get("message") or "").strip()
        filters_text = (data.get("filters") or "").strip()
        search_mode = (data.get("search_mode") or "svd").strip()

        if not user_message and not filters_text:
            return jsonify({"error": "Search criteria required"}), 400

        api_key = os.getenv("SPARK_API_KEY")
        if not api_key:
            return jsonify({"error": "SPARK_API_KEY not set — add it to your .env file"}), 500

        client = LLMClient(api_key=api_key)

        # 1. Transform query
        try:
            search_query = transform_query_for_search(client, user_message, filters_text)
        except Exception as e:
            logger.error(f"Query transform error: {e}")
            search_query = user_message

        # 2. Retrieve Products
        try:
            search_result = search_products_fn(query=search_query, top_k=24, search_mode=search_mode)
            products = search_result.get("results", [])
            query_info = search_result.get("query_info", {})
        except Exception as e:
            logger.error(f"Search error: {e}")
            products = []
            query_info = {}

        if not products:
            return jsonify({
                "search_query": search_query,
                "search_results": [],
                "overview": "I couldn't find any products matching those criteria.",
                "recommended_product_ids": [],
                "product_reasoning": {}
            })

        # 3. Generate Overview and Reasoning
        top_products = products[:6]
        context_text = format_product_context(top_products)
        prompt = [
            {
                "role": "system",
                "content": (
                    "You are the BeautyBytes AI assistant. Analyze the retrieved products against the user's specific intent. "
                    "You MUST respond ONLY with a perfectly formatted JSON object. "
                    "The JSON object must have exactly these keys:\n"
                    "1. \"overview\": A short, helpful paragraph summarizing your findings.\n"
                    "2. \"recommended_product_ids\": A JSON array of the top 3 product IDs that best and most uniquely match the specific intent. Do not just pick the first ones; ensure diverse and highly relevant recommendations.\n"
                    "3. \"product_reasoning\": A JSON object mapping EACH provided product ID to a short 1-sentence explanation of why it was retrieved/recommended, specifically relating it back to the user's exact needs.\n\n"
                    "Do NOT include markdown formatting like ```json ... ```. Just return the raw JSON text."
                )
            },
            {
                "role": "user",
                "content": f"User intent: {user_message} (Filters: {filters_text})\n\nRetrieved Products:\n{context_text}"
            }
        ]

        try:
            response = client.chat(prompt, stream=False, show_thinking=False)
            content = (response.get("content") or "").strip()
            # Clean up potential markdown blocking
            if content.startswith("```json"): content = content[7:]
            if content.startswith("```"): content = content[3:]
            if content.endswith("```"): content = content[:-3]
            
            ai_data = json.loads(content.strip())
        except Exception as e:
            logger.error(f"JSON Generation error: {e}. Raw content: {response.get('content') if 'response' in locals() else 'None'}")
            # Fallback
            ai_data = {
                "overview": "Here are the top products I found based on your search.",
                "recommended_product_ids": [p['id'] for p in top_products[:3]],
                "product_reasoning": {p['id']: "Matched based on keywords." for p in top_products}
            }

        return jsonify({
            "search_query": search_query,
            "search_results": products,
            "overview": ai_data.get("overview", ""),
            "recommended_product_ids": ai_data.get("recommended_product_ids", []),
            "product_reasoning": ai_data.get("product_reasoning", {}),
            "query_info": query_info
        })

    @app.route("/api/chat", methods=["POST"])
    def chat():
        # Follow-up Chat Route.
        # Streaming, context-aware Q&A based on the currently displayed search results.
        data = request.get_json() or {}
        user_message = (data.get("message") or "").strip()
        current_context = data.get("current_context", "No context provided.")

        if not user_message:
            return jsonify({"error": "Message is required"}), 400

        api_key = os.getenv("SPARK_API_KEY")
        if not api_key:
            return jsonify({"error": "SPARK_API_KEY not set — add it to your .env file"}), 500

        client = LLMClient(api_key=api_key)

        def generate():
            rag_system = (
                "You are a helpful BeautyBytes follow-up assistant. "
                "The user is looking at a specific set of products. You can answer questions "
                "referencing the provided product context. "
                "If the user asks a more general beauty or skincare question, you can answer it using your general knowledge. "
                "If you don't have the exact answer in the context, try to use your best judgment and inferences based on the user's intent. "
                "Be concise, friendly, and helpful. Use simple bolding for emphasis if needed."
            )

            prompt = [
                {"role": "system", "content": rag_system},
                {
                    "role": "user",
                    "content": (
                        f"Currently Displayed Context (Search Results):\n"
                        f"{current_context}\n\n"
                        f"---\n\n"
                        f"User's Follow-Up Question: {user_message}"
                    ),
                },
            ]

            try:
                for chunk in client.chat(prompt, stream=True, show_thinking=False):
                    if chunk.get("content"):
                        yield f"data: {json.dumps({'content': chunk['content']})}\n\n"
            except Exception as e:
                logger.error(f"LLM streaming error: {e}")
                yield f"data: {json.dumps({'error': 'LLM streaming error'})}\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
