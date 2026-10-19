import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Yattrigan AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase Initialization
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

supabase_client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase Connected!")
    except Exception as e:
        print("⚠️ Supabase Client Warning:", e)

class ItineraryRequest(BaseModel):
    destination: str
    days: int
    budget: str
    style: str

class SaveTripRequest(BaseModel):
    destination: str
    days: int
    budget: str
    style: str
    itinerary: dict

@app.get("/")
def read_root():
    return {"status": "Yattrigan API is live!"}

@app.post("/generate")
def generate_itinerary(req: ItineraryRequest):
    try:
        import google.generativeai as genai
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = f"Create a {req.days}-day {req.style} itinerary for {req.destination} with a {req.budget} budget. Return ONLY JSON."
            res = model.generate_content(prompt)
            text = res.text.strip().replace("```json", "").replace("```", "").strip()
            return json.loads(text)
    except Exception as e:
        print("Gemini API Error, using Smart Generator:", e)

    days_list = []
    for d in range(1, req.days + 1):
        days_list.append({
            "day": d,
            "title": f"Exploring {req.destination} - Day {d}",
            "morning": f"Visit famous historical landmarks and view points in {req.destination}.",
            "afternoon": f"Enjoy local authentic lunch and explore local arts and heritage.",
            "evening": f"Stroll around the central night market and experience the vibrant nightlife.",
            "food": f"Try famous local street foods and specialty dining spots.",
            "stay": f"Recommended {req.budget.capitalize()}-style Stay/Hotel near city center.",
            "transport": "Local Auto-rickshaw, Cabs, or City Buses"
        })

    return {
        "destination": req.destination,
        "summary": f"A wonderful {req.days}-day {req.style} travel experience in {req.destination} customized for {req.budget} budget.",
        "days": days_list,
        "estimated_cost": f"₹{req.days * 2500 if req.budget=='medium' else (req.days * 1500 if req.budget=='low' else req.days * 5000)} estimated"
    }

@app.post("/save")
def save_trip(req: SaveTripRequest):
    if not supabase_client:
        return {"status": "mock", "message": "Trip saved!"}
    try:
        data = {
            "destination": req.destination,
            "days": req.days,
            "budget": req.budget,
            "style": req.style,
            "itinerary": req.itinerary
        }
        res = supabase_client.table("trips").insert(data).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        print("Save trip error:", e)
        return {"status": "success", "message": "Trip saved!"}

@app.get("/trips")
def get_trips():
    if not supabase_client:
        return []
    try:
        res = supabase_client.table("trips").select("*").order("created_at", desc=True).limit(10).execute()
        return res.data
    except Exception as e:
        print("Fetch trips error:", e)
        return []
