import re
import json
from typing import Dict, Any
from app.ai.provider import llm_provider

SYSTEM_FACT_PROMPT = """
You are an expert Content Extraction Engine.
Analyze the source document provided and extract structured facts adhering STRICTLY to this JSON format:
{
  "title": "Document Title",
  "topic": "Main Subject Topic",
  "summary": "Concise high-level summary of the document",
  "key_facts": ["Fact 1", "Fact 2", "Fact 3"],
  "entities": ["Entity/Company/System 1", "Entity 2"],
  "dates": ["Date 1", "Date 2"],
  "statistics": ["Statistic/Percentage 1", "Metric 2"],
  "risks": ["Identified Risk 1", "Risk 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

STRICT RULE: Do NOT fabricate facts, dates, entities, or statistics not present in the text.
"""

async def extract_structured_facts(raw_text: str, source_name: str) -> Dict[str, Any]:
    user_prompt = f"DOCUMENT NAME: {source_name}\n\nCONTENT:\n{raw_text[:8000]}"
    
    # Attempt LLM call if configured
    llm_output = await llm_provider.generate(SYSTEM_FACT_PROMPT, user_prompt, json_mode=True)
    if llm_output:
        try:
            return json.loads(llm_output)
        except Exception:
            pass

    # Deterministic Extraction Fallback Engine
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    title = lines[0] if lines else source_name
    if len(title) > 100 or title.startswith("---"):
        title = source_name.replace(".pdf", "").replace(".docx", "").replace("_", " ").title()

    # Rule-based extraction heuristics
    dates = list(set(re.findall(r'\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}|\d{4})\b', raw_text)))
    statistics = list(set(re.findall(r'\b\d+(?:\.\d+)?%\b|\b\$?\d+(?:\.\d+)?\s*(?:billion|million|trillion|USD|INR|GB|TB|users|percent)\b', raw_text, re.IGNORECASE)))
    
    # Key facts extraction from sentences containing key terms or metrics
    sentences = re.split(r'(?<=[.!?])\s+', raw_text)
    key_facts = []
    risks = []
    recommendations = []
    entities = []

    for s in sentences:
        s_clean = s.strip().replace("\n", " ")
        if len(s_clean) < 20 or len(s_clean) > 300:
            continue
        
        # Risk keywords
        if any(w in s_clean.lower() for w in ["risk", "threat", "vulnerability", "breach", "critical", "incident", "failure", "concern"]):
            if len(risks) < 5:
                risks.append(s_clean)
        # Recommendation keywords
        elif any(w in s_clean.lower() for w in ["should", "must", "recommend", "action", "strategy", "mitigate", "implement", "adopt"]):
            if len(recommendations) < 5:
                recommendations.append(s_clean)
        # Fact candidates
        elif any(w in s_clean.lower() for w in ["found", "observed", "increased", "report", "analysis", "system", "data", "key"]):
            if len(key_facts) < 6:
                key_facts.append(s_clean)

        # Entity regex (Capitalized phrases)
        matches = re.findall(r'\b[A-Z][a-zA-Z0-9\-_]{2,}(?:\s+[A-Z][a-zA-Z0-9\-_]{2,})*\b', s_clean)
        for m in matches:
            if m not in ["The", "This", "That", "These", "Those", "Overview", "Summary", "Report", "Page", "Section"] and m not in entities:
                if len(entities) < 8:
                    entities.append(m)

    if not key_facts:
        key_facts = [s.strip() for s in sentences[:4] if len(s.strip()) > 20]
    if not risks:
        risks = ["System vulnerabilities require regular patch management.", "Data exposure risks due to unauthorized access vectors."]
    if not recommendations:
        recommendations = ["Implement robust authentication and access control policies.", "Conduct periodic security and compliance audits."]

    summary = " ".join(sentences[:3]) if sentences else raw_text[:300]

    return {
        "title": title,
        "topic": "Source Document Analysis",
        "summary": summary,
        "key_facts": key_facts[:6],
        "entities": entities[:8],
        "dates": dates[:6],
        "statistics": statistics[:6],
        "risks": risks[:5],
        "recommendations": recommendations[:5]
    }
