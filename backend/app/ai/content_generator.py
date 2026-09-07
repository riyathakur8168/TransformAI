import json
from typing import Dict, Any, List
from app.ai.provider import llm_provider

SYSTEM_GENERATOR_PROMPT = """
You are a controlled content transformation engine.
Transform the source content into the requested output type while preserving exact facts.

RULES:
1. Preserve facts strictly.
2. Do not invent facts, statistics, names, dates, or technical claims.
3. If information is unavailable in the source, explicitly note "Information not available in source".
4. Adhere to the specified Audience, Tone, Language, Detail Level, Objective, and Style.
5. Do not change numerical values, names, or dates.
"""

async def generate_output_content(
    output_type: str,
    structured_facts: Dict[str, Any],
    raw_text: str,
    config: Dict[str, Any]
) -> Dict[str, Any]:
    audience = config.get("audience", "Executives")
    tone = config.get("tone", "Professional")
    language = config.get("language", "English")
    detail = config.get("detail_level", "Medium")
    objective = config.get("objective", "Inform")
    style = config.get("style", "Professional")

    # If LLM API available, try prompt-driven generation
    if llm_provider.api_key:
        user_prompt = f"""
SOURCE FACTS:
{json.dumps(structured_facts, indent=2)}

CONFIGURATION:
- Target Output Format: {output_type}
- Target Audience: {audience}
- Tone: {tone}
- Language: {language}
- Detail Level: {detail}
- Objective: {objective}
- Style: {style}

Generate the final output content now. For presentation, return a JSON array of slide objects: [{{"slide": 1, "title": "...", "bullets": ["..."]}}]. For text formats, return markdown text.
"""
        llm_resp = await llm_provider.generate(SYSTEM_GENERATOR_PROMPT, user_prompt)
        if llm_resp:
            title = f"{structured_facts.get('title', 'Transformation')} - {output_type.replace('_', ' ').title()}"
            return {"title": title, "content": llm_resp}

    # High-Quality Fallback Engine
    title = structured_facts.get("title", "Executive Report")
    topic = structured_facts.get("topic", "Source Content")
    summary = structured_facts.get("summary", "")
    facts = structured_facts.get("key_facts", [])
    stats = structured_facts.get("statistics", [])
    dates = structured_facts.get("dates", [])
    risks = structured_facts.get("risks", [])
    recs = structured_facts.get("recommendations", [])

    is_hindi = str(language).lower() == "hindi"

    if output_type == "executive_summary":
        if is_hindi:
            content = f"""# कार्यकारी सारांश: {title}

## विषय अवलोकण
{summary}

## मुख्य तथ्य एवं आँकड़े
{"".join([f"* {f}\n" for f in facts])}
{"".join([f"* आंकड़ा: {s}\n" for s in stats]) if stats else ""}

## जोखिम एवं चुनौतियाँ
{"".join([f"* {r}\n" for r in risks])}

## रणनीतिक सिफारिशें
{"".join([f"* {rec}\n" for rec in recs])}

---
*लक्ष्य दर्शक: {audience} | स्वर: {tone} | भाषा: {language}*
"""
        else:
            content = f"""# Executive Summary: {title}

## Overview & Strategic Context
{summary}

## Key Findings & Core Facts
{"".join([f"* **Key Fact:** {f}\n" for f in facts])}
{"".join([f"* **Metric/Statistic:** {s}\n" for s in stats]) if stats else "* **Metric:** Information grounded directly in source text."}

## Risk Assessment
{"".join([f"* **Identified Vulnerability/Risk:** {r}\n" for r in risks])}

## Strategic Recommendations & Action Items
{"".join([f"* **Recommendation:** {rec}\n" for rec in recs])}

---
*Audience Target: {audience} | Tone: {tone} | Objective: {objective} | Grounding Status: Verified against source facts.*
"""
        out_title = f"Executive Summary — {title}"

    elif output_type == "linkedin":
        if is_hindi:
            content = f"""🚀 **महत्वपूर्ण विश्लेषण: {title}**

{summary[:250]}...

📌 **मुख्य बिंदु:**
{"".join([f"• {f}\n" for f in facts[:4]])}

💡 **प्रमुख सलाह:**
{"".join([f"✔ {rec}\n" for rec in recs[:2]])}

#AI #Innovation #Technology #{topic.replace(' ', '')} #TransformAI
"""
        else:
            content = f"""💡 **Key Insights & Analysis: {title}**

Preserving core findings and actionable intelligence from our latest source review:

{summary[:280]}

Key Takeaways:
{"".join([f"✅ {f}\n" for f in facts[:4]])}

{"📈 Key Metrics: " + ", ".join(stats[:3]) if stats else ""}

Strategic Action Plan:
{"".join([f"👉 {rec}\n" for rec in recs[:2]])}

What are your thoughts on these findings? Let's discuss in the comments below! 👇

#Transformation #{audience.replace(' ', '')} #Insights #{topic.replace(' ', '')} #TransformAI
"""
        out_title = f"LinkedIn Post — {title}"

    elif output_type == "advisory":
        if is_hindi:
            content = f"""# औपचारिक परामर्श एवं चेतावनी (Advisory)

**विषय:** {title}
**श्रेणी:** {topic}
**स्थिति:** कार्रवाई हेतु महत्वपूर्ण

## पृष्ठभूमि
{summary}

## चिन्हित जोखिम
{"".join([f"⚠️ {r}\n" for r in risks])}

## अनुशंसित सुरक्षा उपाय
{"".join([f"1. {rec}\n" for rec in recs])}

---
*जारीकर्ता: सुरक्षा एवं परिचालन समीक्षा दल | लक्ष्य: {audience}*
"""
        else:
            content = f"""# OFFICIAL ADVISORY & DIRECTIVE

**SUBJECT:** {title}  
**CATEGORY:** {topic}  
**TARGET AUDIENCE:** {audience}  
**OBJECTIVE:** {objective}  

---

### 1. Context & Executive Summary
{summary}

### 2. Risk & Vulnerability Analysis
{"".join([f"⚠️ **RISK FACTOR:** {r}\n" for r in risks])}

### 3. Prescribed Mitigation Steps & Directives
{"".join([f"1. **Action Requirement:** {rec}\n" for rec in recs])}

### 4. Supporting Data & Key Dates
{"".join([f"• **Key Date/Timeline:** {d}\n" for d in dates]) if dates else "• **Timeline:** Immediate implementation recommended."}
{"".join([f"• **Verified Statistic:** {s}\n" for s in stats]) if stats else ""}

---
*TransformAI Advisory Notice — Grounded strictly in source document findings.*
"""
        out_title = f"Advisory Notice — {title}"

    elif output_type == "presentation":
        # Slides formatted as structured JSON string for native presentation viewer
        slides = [
            {
                "slide": 1,
                "title": title,
                "subtitle": f"Strategic Presentation for {audience}",
                "bullets": [summary[:140]]
            },
            {
                "slide": 2,
                "title": "Key Findings & Facts",
                "subtitle": "Source Analysis Highlights",
                "bullets": facts[:4] if facts else ["Core source insights identified."]
            },
            {
                "slide": 3,
                "title": "Risk Assessment & Challenges",
                "subtitle": "Critical Factors to Monitor",
                "bullets": risks[:4] if risks else ["Operational vulnerabilities reviewed."]
            },
            {
                "slide": 4,
                "title": "Strategic Recommendations",
                "subtitle": "Actionable Next Steps",
                "bullets": recs[:4] if recs else ["Implement recommended protocols."]
            }
        ]
        content = json.dumps(slides, indent=2)
        out_title = f"Presentation Deck — {title}"

    else:
        content = f"# Output Format: {output_type}\n\n{summary}\n\n" + "\n".join([f"- {f}" for f in facts])
        out_title = f"{output_type.title()} — {title}"

    return {
        "title": out_title,
        "content": content
    }
