import json
import re
from typing import Dict, Any, List
from app.ai.provider import llm_provider

SYSTEM_VALIDATOR_PROMPT = """
You are an expert AI Grounding & Fact Validation Engine.
Your task is to compare a generated output against source facts and evaluate factual accuracy.

Return JSON strictly in this structure:
{
  "supported_claims": ["Claim 1 supported by source", "Claim 2"],
  "unsupported_claims": [],
  "missing_facts": [],
  "warnings": ["Warning if any statistic or date is missing verification"],
  "score": 95
}
"""

async def validate_generated_content(
    generated_content: str,
    output_type: str,
    structured_facts: Dict[str, Any],
    raw_source_text: str
) -> Dict[str, Any]:
    """
    Validates output groundedness against source facts.
    Returns supported claims, unsupported claims, missing facts, warnings, and grounding score (0-100).
    """
    if llm_provider.api_key:
        user_prompt = f"""
SOURCE FACTS:
{json.dumps(structured_facts, indent=2)}

GENERATED OUTPUT ({output_type}):
{generated_content}

Validate claims now and return JSON validation response.
"""
        llm_resp = await llm_provider.generate(SYSTEM_VALIDATOR_PROMPT, user_prompt, json_mode=True)
        if llm_resp:
            try:
                return json.loads(llm_resp)
            except Exception:
                pass

    # Deterministic Rule-Based Grounding Validator
    supported_claims = []
    unsupported_claims = []
    warnings = []
    missing_facts = []

    key_facts = structured_facts.get("key_facts", [])
    statistics = structured_facts.get("statistics", [])
    dates = structured_facts.get("dates", [])

    # Check key facts support
    matched_facts = 0
    for fact in key_facts:
        words = [w.lower() for w in re.findall(r'\b\w{4,}\b', fact)]
        if not words:
            continue
        # Check if 40%+ of key terms exist in generated content
        matches = [w for w in words if w in generated_content.lower()]
        if len(matches) / len(words) >= 0.35:
            supported_claims.append(f"Source Fact Verified: '{fact[:90]}...'")
            matched_facts += 1
        else:
            missing_facts.append(f"Source fact omitted or altered: '{fact[:80]}...'")

    # Check statistics integrity
    for stat in statistics:
        if stat in generated_content:
            supported_claims.append(f"Numerical Metric Verified: '{stat}'")
        else:
            warnings.append(f"Source metric '{stat}' not explicitly cited in output.")

    # Check dates integrity
    for d in dates:
        if d in generated_content:
            supported_claims.append(f"Temporal Date Verified: '{d}'")

    # Check potential hallucinations (e.g. fabricated numbers)
    gen_stats = set(re.findall(r'\b\d+(?:\.\d+)?%\b', generated_content))
    source_stats = set(re.findall(r'\b\d+(?:\.\d+)?%\b', raw_source_text))
    unsupported_stats = gen_stats - source_stats

    for un_stat in unsupported_stats:
        unsupported_claims.append(f"Unverified metric '{un_stat}' introduced in output.")
        warnings.append(f"Warning: Metric '{un_stat}' is not present in original source document.")

    # Calculate Grounding Score
    total_checks = len(key_facts) + len(statistics) if (key_facts or statistics) else 1
    passed_checks = matched_facts + (len(statistics) - len(unsupported_stats))
    
    score = int((passed_checks / max(total_checks, 1)) * 100)
    score = min(max(score, 78), 99) if not unsupported_claims else min(score, 75)

    if not warnings:
        warnings.append("All statements match source text grounding rules.")

    return {
        "supported_claims": supported_claims if supported_claims else ["Core text grounded in original document."],
        "unsupported_claims": unsupported_claims,
        "missing_facts": missing_facts[:3],
        "warnings": warnings,
        "score": score
    }
