from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import json
from openai import AsyncOpenAI
import google.generativeai as genai
from groq import AsyncGroq

router = APIRouter(
    prefix="/analyzer",
    tags=["generate"],
)

class GenerateRequest(BaseModel):
    prompt: str
    framework: Optional[str] = "react"

class GenerateResponse(BaseModel):
    code: str
    explanation: str

@router.post("/generate", response_model=GenerateResponse)
async def generate_ui(request: GenerateRequest):
    """
    Try AI models in waterfall order:
    1. OpenAI (paid, best quality)
    2. Google Gemini (free tier available)
    3. Groq (free, extremely fast)
    4. Mock fallback
    """
    
    system_prompt = f"""
You are an expert frontend developer.
Generate high-quality, modern, and responsive UI components using {request.framework}.
Return ONLY a JSON object with:
{{
  "code": "The complete source code of the component",
  "explanation": "A brief explanation of the design and implementation"
}}
"""

    # Try OpenAI first (best quality)
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key and openai_key != "dummy-key":
        try:
            print(f"[Analyzer] Trying OpenAI for: {request.prompt}")
            client = AsyncOpenAI(api_key=openai_key)
            response = await client.chat.completions.create(
                model="gpt-4o-mini",  # Cheaper variant
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": request.prompt}
                ],
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            if content:
                data = json.loads(content)
                print("[Analyzer] ✅ OpenAI succeeded")
                return GenerateResponse(code=data.get("code", ""), explanation=data.get("explanation", ""))
        except Exception as e:
            print(f"[Analyzer] ❌ OpenAI failed: {e}")

    # Try Gemini (free tier)
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key and gemini_key != "dummy-key":
        try:
            print(f"[Analyzer] Trying Gemini for: {request.prompt}")
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                generation_config={"response_mime_type": "application/json"}
            )
            result = model.generate_content(f"{system_prompt}\n\nUser request: {request.prompt}")
            text = result.text
            if text:
                data = json.loads(text)
                print("[Analyzer] ✅ Gemini succeeded")
                return GenerateResponse(code=data.get("code", ""), explanation=data.get("explanation", ""))
        except Exception as e:
            print(f"[Analyzer] ❌ Gemini failed: {e}")

    # Try Groq (free, very fast)
    groq_key = os.getenv("GROQ_API_KEY", "")
    if groq_key:
        try:
            print(f"[Analyzer] Trying Groq for: {request.prompt}")
            client = AsyncGroq(api_key=groq_key)
            response = await client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": request.prompt}
                ],
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            if content:
                data = json.loads(content)
                print("[Analyzer] ✅ Groq succeeded")
                return GenerateResponse(code=data.get("code", ""), explanation=data.get("explanation", ""))
        except Exception as e:
            print(f"[Analyzer] ❌ Groq failed: {e}")

    # Final fallback: Mock
    print("[Analyzer] ⚠️ All AI models failed or unavailable, returning mock")
    return GenerateResponse(
        code="""import React from 'react';

export default function Component() {
  return (
    <div className="p-8 bg-gray-900 text-white rounded-lg">
      <h2 className="text-2xl font-bold mb-4">AI Generation Unavailable</h2>
      <p className="text-gray-400">All AI providers are currently unavailable. Please check your API keys or try again later.</p>
    </div>
  );
}""",
        explanation="Fallback mock - all AI models failed or quota exceeded."
    )
