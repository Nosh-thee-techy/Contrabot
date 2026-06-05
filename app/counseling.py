from app.openai_client import chat_completion
from ingest import query_knowledge_base

SYSTEM_PROMPT = (
    "You are ContraBot, a contraception counselor trained on the WHO Medical Eligibility Criteria (MEC) and APHRC research. "
    "Your role is to provide personalized, evidence-based information to help users make informed decisions about contraception.\n\n"
    "RULES:\n"
    "1. Never diagnose medical conditions. Never prescribe medication.\n"
    "2. Always recommend clinic or CHW confirmation before starting a method.\n"
    "3. If the user reports hypertension, migraine with aura, or history of DVT/PE, do NOT recommend combined hormonal methods. "
    "State: 'Based on what you have told me, please visit a clinic before starting any hormonal method. This is important for your safety.'\n"
    "4. Use plain, respectful language. All users deserve non-judgmental care.\n"
    "5. For side effect queries, assess severity and provide switching guidance when appropriate.\n"
    "6. Keep responses concise (under 160 chars for USSD, under 300 chars for WhatsApp).\n"
    "7. Use retrieved knowledge base information (WHO MEC and APHRC data) to support your recommendations.\n"
)


def _fallback_response(user_query: str, context: str, channel: str) -> str:
    """Fallback response when no LLM is available (for testing RAG)."""
    if "breastfeed" in user_query.lower():
        return "Progestogen-only methods (mini-pill, implant, injection) are safe while breastfeeding. Consult your clinic for best option."
    if "migraine" in user_query.lower() or "aura" in user_query.lower():
        return "Based on what you have told me, please visit a clinic before starting any hormonal method. This is important for your safety."
    if "side effect" in user_query.lower() or "problem" in user_query.lower():
        return "Side effects may improve with time. If they persist, visit your clinic for alternative methods."
    return "Please visit a clinic or speak with a CHW for personalized advice on contraception."


def get_counseling_response(user_query: str, channel: str = "whatsapp", language: str = "english") -> str:
    """
    Generate a contraceptive counseling response using RAG (retrieval-augmented generation).
    Queries knowledge base for relevant WHO MEC and APHRC data before LLM completion.

    Args:
        user_query: The user's question or input
        channel: 'ussd', 'whatsapp', or 'web'
        language: Language code (e.g., 'english', 'swahili', 'luganda')

    Returns:
        Plain text counseling response
    """
    max_tokens = 160 if channel == "ussd" else 300
    model = "gpt-3.5-turbo"

    try:
        # Query knowledge base for relevant documents
        kb_results = query_knowledge_base(user_query, num_results=3)
        
        # Build context from retrieved chunks
        context = ""
        if kb_results and kb_results.get("documents"):
            context = "Relevant knowledge base excerpts:\n"
            for i, doc in enumerate(kb_results["documents"][0][:3], 1):
                context += f"{i}. {doc[:150]}...\n"
        
        # Build messages with context
        user_message = user_query
        if context:
            user_message = f"Context from knowledge base:\n{context}\n\nUser query: {user_query}"
        
        response = chat_completion(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            model=model,
            temperature=0.7,
            max_tokens=max_tokens,
        )
        return response
    except RuntimeError as e:
        # No LLM available; use fallback for testing
        if "No LLM client" in str(e):
            return _fallback_response(user_query, "", channel)
        return f"I encountered an error processing your request: {str(e)}"
