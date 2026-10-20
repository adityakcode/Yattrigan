
import json
import logging
import os
from typing import Any, Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

load_dotenv()

# -------------------------------------------------------------------
# Configuration
# -------------------------------------------------------------------

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("yattrigan")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv(
    "GROQ_MODEL", "llama-3.3-70b-versatile"
).strip()
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()

CORS_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173",
    ).split(",")
    if origin.strip()
]

# Never allow wildcard origins in a credentialed configuration.
app = FastAPI(
    title="Yattrigan AI Backend",
    version="1.0.0",
    description="AI-powered Indian travel itinerary planning API",
    docs_url="/docs" if os.getenv("ENABLE_DOCS", "true").lower() == "true" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# -------------------------------------------------------------------
# Supabase initialization
# -------------------------------------------------------------------

supabase_client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client

        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized")
    except Exception:
        # Do not log credentials or raw connection details.
        logger.exception("Supabase initialization failed")
else:
    logger.warning("Supabase is not configured; trip storage is disabled")


# -------------------------------------------------------------------
# Request and response models
# -------------------------------------------------------------------

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ItineraryRequest(StrictModel):
    destination: str = Field(
        min_length=2,
        max_length=120,
        description="City or region to visit",
    )
    days: int = Field(ge=1, le=30)
    budget: str = Field(min_length=2, max_length=100)
    style: str = Field(min_length=2, max_length=100)
    notes: str = Field(default="", max_length=800)

    @field_validator("destination", "budget", "style")
    @classmethod
    def reject_blank_strings(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("This field cannot be blank")
        return value.strip()


class ItineraryDay(StrictModel):
    day: int = Field(ge=1, le=30)
    title: str = Field(min_length=1, max_length=160)
    morning: str = Field(min_length=1, max_length=2000)
    afternoon: str = Field(min_length=1, max_length=2000)
    evening: str = Field(min_length=1, max_length=2000)
    food: str = Field(min_length=1, max_length=1500)
    stay: str = Field(min_length=1, max_length=1000)
    transport: str = Field(min_length=1, max_length=1000)
    day_cost: str = Field(min_length=1, max_length=200)


class ItineraryResponse(StrictModel):
    destination: str = Field(min_length=1, max_length=120)
    summary: str = Field(min_length=1, max_length=1000)
    days: list[ItineraryDay] = Field(min_length=1, max_length=30)
    estimated_cost: str = Field(min_length=1, max_length=200)


class SaveTripRequest(ItineraryRequest):
    itinerary: ItineraryResponse


# -------------------------------------------------------------------
# Groq itinerary generation
# -------------------------------------------------------------------

def generate_with_groq(req: ItineraryRequest) -> ItineraryResponse:
    if not GROQ_API_KEY:
        logger.error("Groq API key is not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI itinerary generation is temporarily unavailable.",
        )

    system_prompt = """
You are Yattrigan, an expert Indian travel planner.

Create practical, realistic travel itineraries. Use real places, attractions,
markets, restaurants and hotels wherever possible. Never invent facts just to
fill a section. If a price or opening time is uncertain, clearly label it as
an estimate or something to verify.

Requirements:
- Use Indian rupees (INR) for costs.
- Give each day a distinct theme and different activities.
- Include morning, afternoon and evening plans with approximate timings.
- Recommend actual regional dishes and named places to try them.
- Suggest two real hotel options consistent with the requested budget.
- Explain practical transportation options.
- Keep costs approximate and state when accommodation or transport is excluded.
- Return a JSON object matching the requested fields, with no Markdown.
"""

    user_prompt = f"""
Create a {req.days}-day itinerary for this destination: {req.destination}

Budget: {req.budget}
Travel style: {req.style}

Return a single JSON object (NOT an array) with exactly this structure:
{{
  "destination": "destination name",
  "summary": "A concise overview of the trip",
  "days": [
    {{
      "day": 1,
      "title": "Theme of the day",
      "morning": "Activity and approximate timing",
      "afternoon": "Activity and approximate timing",
      "evening": "Activity and approximate timing",
      "food": "Specific dishes and named places to eat",
      "stay": "Two hotel options matching the budget",
      "transport": "Practical travel options",
      "day_cost": "Approximate cost in INR"
    }}
  ],
  "estimated_cost": "Approximate total cost in INR"
}}

Include exactly {req.days} day entries, numbered consecutively from 1.
"""

    try:
        with httpx.Client(
            timeout=httpx.Timeout(60.0, connect=10.0),
        ) as client:
            response = client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.4,
                },
            )

    except httpx.TimeoutException:
        logger.warning("Groq request timed out")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Itinerary generation timed out. Please try again.",
        ) from None

    except httpx.RequestError:
        logger.exception("Could not connect to Groq")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach the AI service. Please try again later.",
        ) from None

    if response.status_code != 200:
        # Log status only, not the raw upstream body or API key.
        logger.error("Groq returned HTTP %s: %s", response.status_code, response.text)

        if response.status_code == 429:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The AI service is busy. Please try again shortly.",
            )

        if response.status_code in (401, 403):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The AI service is not configured correctly.",
            )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI service failed to generate an itinerary.",
        )

    try:
        payload: dict[str, Any] = response.json()
        content = payload["choices"][0]["message"]["content"]

        if not isinstance(content, str) or not content.strip():
            raise ValueError("AI returned empty content")

        parsed = json.loads(content)
        
        if isinstance(parsed, list):
            parsed = next(
                (item for item in parsed if isinstance(item, dict) and "days" in item),
                None,
            )
        itinerary = ItineraryResponse.model_validate(parsed)

    except (ValueError, KeyError, IndexError, TypeError, ValidationError):
        logger.exception("Groq returned an invalid itinerary response")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI returned an invalid itinerary. Please try again.",
        ) from None

    # Check cross-field requirements after schema validation.
    if len(itinerary.days) != req.days:
        logger.warning(
            "Wrong number of days returned: expected %s, received %s",
            req.days,
            len(itinerary.days),
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI returned an incomplete itinerary. Please try again.",
        )

    expected_days = list(range(1, req.days + 1))
    actual_days = [day.day for day in itinerary.days]

    if actual_days != expected_days:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI returned incorrectly numbered days. Please try again.",
        )

    return itinerary


# -------------------------------------------------------------------
# API endpoints
# -------------------------------------------------------------------

@app.get("/")
def read_root():
    return {
        "status": "Yattrigan API is live!",
        "version": "1.0.0",
    }


@app.get("/health")
def health_check():
    # This is a basic process/configuration check, not a dependency check.
    return {
        "status": "ok",
        "ai_configured": bool(GROQ_API_KEY),
        "database_configured": supabase_client is not None,
    }


@app.post(
    "/generate",
    response_model=ItineraryResponse,
    status_code=status.HTTP_200_OK,
)
def generate_itinerary(req: ItineraryRequest):
    return generate_with_groq(req)


@app.post("/save", status_code=status.HTTP_201_CREATED)
def save_trip(req: SaveTripRequest):
    if supabase_client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Trip storage is not configured.",
        )

    itinerary = req.itinerary

    if itinerary.destination.casefold() != req.destination.casefold():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The itinerary destination must match the trip destination.",
        )

    if len(itinerary.days) != req.days:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The itinerary day count must match the requested trip duration.",
        )

    if [day.day for day in itinerary.days] != list(range(1, req.days + 1)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Itinerary days must be numbered consecutively from 1.",
        )

    data = {
        "destination": req.destination,
        "days": req.days,
        "budget": req.budget,
        "style": req.style,
        "itinerary": itinerary.model_dump(mode="json"),
    }

    try:
        result = supabase_client.table("trips").insert(data).execute()
        rows = result.data or []

        if not rows:
            logger.error("Supabase insert returned no row")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The trip could not be confirmed as saved.",
            )

        # Return only the newly saved record.
        return {"status": "success", "data": rows[0]}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to save trip to Supabase")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not save the trip. Please try again later.",
        ) from None


@app.get("/trips")
def get_trips():
    if supabase_client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Trip storage is not configured.",
        )

    try:
        result = (
            supabase_client.table("trips")
            .select("*")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        return result.data or []

    except Exception:
        logger.exception("Failed to retrieve trips from Supabase")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not retrieve trips. Please try again later.",
        ) from None
