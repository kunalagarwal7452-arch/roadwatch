
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import json
import uuid
import os
from datetime import datetime
import base64
 
app = FastAPI(title="RoadWatch API", version="1.0.0")
 
# CORS — allow frontend and mobile to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
# ─── In-memory DB (replace with PostgreSQL in production) ───────────────────
reports_db: List[dict] = []
spending_db = [
    {"city": "Chennai",    "allocated": 120, "spent": 45,  "repaired": 38},
    {"city": "Mumbai",     "allocated": 300, "spent": 210, "repaired": 180},
    {"city": "Delhi",      "allocated": 450, "spent": 300, "repaired": 260},
    {"city": "Bangalore",  "allocated": 200, "spent": 120, "repaired": 95},
    {"city": "Hyderabad",  "allocated": 180, "spent": 90,  "repaired": 70},
    {"city": "Kolkata",    "allocated": 160, "spent": 80,  "repaired": 60},
]
 
# ─── Pydantic Models ─────────────────────────────────────────────────────────
class ReportCreate(BaseModel):
    description: str
    latitude: float
    longitude: float
    city: str
    reporter_name: Optional[str] = "Anonymous"
 
class StatusUpdate(BaseModel):
    status: str  # reported | under_review | action_taken | resolved
 
class AIClassification(BaseModel):
    hazard_type: str
    severity: str
    confidence: float
    suggested_action: str
 
# ─── AI Classification (rule-based + Gemini-ready) ───────────────────────────
def classify_hazard(description: str) -> AIClassification:
    """
    Rule-based classifier — swap with Gemini API call in production.
    Analyzes description keywords to assign type, severity, and action.
    """
    desc = description.lower()
 
    # Determine hazard type
    if any(w in desc for w in ["pothole", "hole", "crater", "dent", "pit"]):
        hazard_type = "Pothole"
        suggested_action = "Road resurfacing required — schedule within 7 days"
    elif any(w in desc for w in ["signal", "traffic light", "light not working", "broken signal"]):
        hazard_type = "Broken Traffic Signal"
        suggested_action = "Signal maintenance team dispatch required"
    elif any(w in desc for w in ["dark", "no light", "streetlight", "lamp", "lighting"]):
        hazard_type = "Poor Street Lighting"
        suggested_action = "Street lighting inspection and repair needed"
    elif any(w in desc for w in ["crack", "broken road", "damaged", "uneven"]):
        hazard_type = "Road Damage"
        suggested_action = "Road inspection and patch repair required"
    elif any(w in desc for w in ["flood", "water", "waterlog", "drain", "drainage"]):
        hazard_type = "Waterlogging / Drainage Issue"
        suggested_action = "Drainage clearance and flood mitigation required"
    elif any(w in desc for w in ["debris", "garbage", "waste", "trash", "rubble"]):
        hazard_type = "Road Debris / Obstruction"
        suggested_action = "Immediate debris clearance required"
    else:
        hazard_type = "General Road Hazard"
        suggested_action = "Site inspection required by road authority"
 
    # Determine severity
    if any(w in desc for w in ["large", "big", "severe", "dangerous", "deep", "serious", "accident", "critical"]):
        severity = "High"
        confidence = 0.91
    elif any(w in desc for w in ["medium", "moderate", "average", "growing"]):
        severity = "Medium"
        confidence = 0.83
    else:
        severity = "Low"
        confidence = 0.76
 
    return AIClassification(
        hazard_type=hazard_type,
        severity=severity,
        confidence=confidence,
        suggested_action=suggested_action
    )
 
# ─── Routes ──────────────────────────────────────────────────────────────────
 
@app.get("/")
def root():
    return {"message": "RoadWatch API is live 🚦", "version": "1.0.0"}
 
 
@app.post("/reports/submit")
async def submit_report(
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    city: str = Form(...),
    reporter_name: str = Form("Anonymous"),
    image: Optional[UploadFile] = File(None)
):
    """Submit a new road hazard report with optional photo."""
    report_id = str(uuid.uuid4())[:8].upper()
 
    # AI classification
    classification = classify_hazard(description)
 
    # Handle image
    image_data = None
    if image:
        contents = await image.read()
        image_data = base64.b64encode(contents).decode("utf-8")
 
    report = {
        "id": report_id,
        "description": description,
        "latitude": latitude,
        "longitude": longitude,
        "city": city,
        "reporter_name": reporter_name,
        "hazard_type": classification.hazard_type,
        "severity": classification.severity,
        "confidence": classification.confidence,
        "suggested_action": classification.suggested_action,
        "status": "Reported",
        "status_history": [
            {"status": "Reported", "timestamp": datetime.now().isoformat()}
        ],
        "submitted_at": datetime.now().isoformat(),
        "image": image_data,
        "upvotes": 0,
    }
 
    reports_db.append(report)
 
    return {
        "success": True,
        "report_id": report_id,
        "message": f"Report #{report_id} submitted successfully!",
        "classification": {
            "hazard_type": classification.hazard_type,
            "severity": classification.severity,
            "confidence": round(classification.confidence * 100, 1),
            "suggested_action": classification.suggested_action
        }
    }
 
 
@app.get("/reports/all")
def get_all_reports(city: Optional[str] = None, severity: Optional[str] = None):
    """Get all reports, optionally filtered by city or severity."""
    results = reports_db
    if city:
        results = [r for r in results if r["city"].lower() == city.lower()]
    if severity:
        results = [r for r in results if r["severity"].lower() == severity.lower()]
    return {"total": len(results), "reports": results}
 
 
@app.get("/reports/{report_id}")
def get_report(report_id: str):
    """Get a single report by ID."""
    for r in reports_db:
        if r["id"] == report_id:
            return r
    raise HTTPException(status_code=404, detail="Report not found")
 
 
@app.patch("/reports/{report_id}/status")
def update_status(report_id: str, update: StatusUpdate):
    """Update the status of a report (for authorities)."""
    valid_statuses = ["Reported", "Under Review", "Action Taken", "Resolved"]
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {valid_statuses}")
 
    for r in reports_db:
        if r["id"] == report_id:
            r["status"] = update.status
            r["status_history"].append({
                "status": update.status,
                "timestamp": datetime.now().isoformat()
            })
            return {"success": True, "report_id": report_id, "new_status": update.status}
 
    raise HTTPException(status_code=404, detail="Report not found")
 
 
@app.post("/reports/{report_id}/upvote")
def upvote_report(report_id: str):
    """Upvote a report to indicate it's a known issue."""
    for r in reports_db:
        if r["id"] == report_id:
            r["upvotes"] += 1
            return {"success": True, "upvotes": r["upvotes"]}
    raise HTTPException(status_code=404, detail="Report not found")
 
 
@app.get("/stats/summary")
def get_stats():
    """Get summary statistics for the dashboard."""
    total = len(reports_db)
    resolved = len([r for r in reports_db if r["status"] == "Resolved"])
    high_severity = len([r for r in reports_db if r["severity"] == "High"])
    cities = list(set(r["city"] for r in reports_db))
 
    type_counts = {}
    for r in reports_db:
        t = r["hazard_type"]
        type_counts[t] = type_counts.get(t, 0) + 1
 
    return {
        "total_reports": total,
        "resolved": resolved,
        "pending": total - resolved,
        "high_severity": high_severity,
        "cities_covered": len(cities),
        "hazard_type_breakdown": type_counts,
        "resolution_rate": round((resolved / total * 100), 1) if total > 0 else 0
    }
 
 
@app.get("/spending/dashboard")
def get_spending():
    """Get government road spending data per city."""
    return {
        "data": spending_db,
        "total_allocated_cr": sum(c["allocated"] for c in spending_db),
        "total_spent_cr": sum(c["spent"] for c in spending_db),
        "total_repaired_km": sum(c["repaired"] for c in spending_db),
    }
 
 
@app.get("/heatmap/data")
def get_heatmap():
    """Get location data for heatmap rendering."""
    points = [
        {
            "lat": r["latitude"],
            "lng": r["longitude"],
            "severity": r["severity"],
            "type": r["hazard_type"],
            "id": r["id"]
        }
        for r in reports_db
    ]
    return {"points": points}