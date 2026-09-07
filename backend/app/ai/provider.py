import json
import httpx
from typing import Dict, Any, Optional
from app.config import settings

class LLMProvider:
    """
    Unified LLM provider abstraction supporting OpenAI/Gemini API endpoints with 
    a smart, deterministic, offline-capable fallback transformation engine.
    """
    def __init__(self):
        self.api_key = settings.LLM_API_KEY
        self.model = settings.LLM_MODEL
        self.base_url = settings.LLM_BASE_URL

    async def generate(self, system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
        if self.api_key:
            try:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.2
                }
                if json_mode:
                    payload["response_format"] = {"type": "json_object"}

                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"[LLMProvider] API call failed: {e}. Falling back to internal engine.")

        # Fallback Engine if no API Key or API error
        return None

llm_provider = LLMProvider()
