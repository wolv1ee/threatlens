from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
import hashlib
import base64
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Malware & Phishing Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")
GOOGLE_SAFE_BROWSING_KEY = os.getenv("GOOGLE_SAFE_BROWSING_KEY")


class URLRequest(BaseModel):
    url: str


# ── Helpers ──────────────────────────────────────────────────────────────────

async def check_google_safe_browsing(url: str) -> dict:
    """Check URL against Google Safe Browsing API."""
    if not GOOGLE_SAFE_BROWSING_KEY:
        return {"safe": True, "threats": [], "source": "google_safe_browsing", "skipped": True}

    payload = {
        "client": {"clientId": "malware-analyzer", "clientVersion": "1.0"},
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}],
        },
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={GOOGLE_SAFE_BROWSING_KEY}",
            json=payload,
            timeout=10,
        )
        data = resp.json()
        matches = data.get("matches", [])
        return {
            "safe": len(matches) == 0,
            "threats": [m.get("threatType") for m in matches],
            "source": "google_safe_browsing",
        }


async def check_virustotal_url(url: str) -> dict:
    """Submit URL to VirusTotal and get analysis."""
    if not VIRUSTOTAL_API_KEY:
        return {"safe": True, "detections": 0, "total": 0, "source": "virustotal", "skipped": True}

    headers = {"x-apikey": VIRUSTOTAL_API_KEY}
    encoded_url = base64.urlsafe_b64encode(url.encode()).decode().rstrip("=")

    async with httpx.AsyncClient() as client:
        # First try to get existing report
        resp = await client.get(
            f"https://www.virustotal.com/api/v3/urls/{encoded_url}",
            headers=headers,
            timeout=15,
        )
        if resp.status_code == 200:
            data = resp.json()
            stats = data["data"]["attributes"]["last_analysis_stats"]
            return {
                "safe": stats.get("malicious", 0) == 0 and stats.get("suspicious", 0) == 0,
                "detections": stats.get("malicious", 0) + stats.get("suspicious", 0),
                "total": sum(stats.values()),
                "source": "virustotal",
            }

        # Submit for analysis if not found
        submit = await client.post(
            "https://www.virustotal.com/api/v3/urls",
            headers=headers,
            data={"url": url},
            timeout=15,
        )
        if submit.status_code == 200:
            return {"safe": True, "detections": 0, "total": 0, "source": "virustotal", "pending": True}

    return {"safe": True, "detections": 0, "total": 0, "source": "virustotal", "error": True}


async def check_virustotal_file(file_hash: str) -> dict:
    """Check a file hash against VirusTotal."""
    if not VIRUSTOTAL_API_KEY:
        return {"safe": True, "detections": 0, "total": 0, "source": "virustotal", "skipped": True}

    headers = {"x-apikey": VIRUSTOTAL_API_KEY}
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://www.virustotal.com/api/v3/files/{file_hash}",
            headers=headers,
            timeout=15,
        )
        if resp.status_code == 200:
            data = resp.json()
            stats = data["data"]["attributes"]["last_analysis_stats"]
            return {
                "safe": stats.get("malicious", 0) == 0,
                "detections": stats.get("malicious", 0),
                "total": sum(stats.values()),
                "file_name": data["data"]["attributes"].get("meaningful_name", "unknown"),
                "file_type": data["data"]["attributes"].get("type_description", "unknown"),
                "source": "virustotal",
            }
    return {"safe": True, "detections": 0, "total": 0, "source": "virustotal", "not_found": True}


def determine_risk(gsb: dict, vt: dict) -> str:
    if not gsb.get("safe") or vt.get("detections", 0) > 5:
        return "dangerous"
    if vt.get("detections", 0) > 0:
        return "suspicious"
    return "safe"


# ── Routes ───────────────────────────────────────────────────────────────────

@app.post("/api/scan/url")
async def scan_url(req: URLRequest):
    url = req.url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    gsb_result, vt_result = await asyncio.gather(
        check_google_safe_browsing(url),
        check_virustotal_url(url),
    )

    risk = determine_risk(gsb_result, vt_result)

    record = {
        "type": "url",
        "target": url,
        "risk": risk,
        "gsb_threats": gsb_result.get("threats", []),
        "vt_detections": vt_result.get("detections", 0),
        "vt_total": vt_result.get("total", 0),
        "scanned_at": datetime.utcnow().isoformat(),
    }
    supabase.table("scans").insert(record).execute()

    return {
        "url": url,
        "risk": risk,
        "google_safe_browsing": gsb_result,
        "virustotal": vt_result,
        "scanned_at": record["scanned_at"],
    }


@app.post("/api/scan/file")
async def scan_file(file: UploadFile = File(...)):
    content = await file.read()
    if len(content) > 32 * 1024 * 1024:  # 32MB limit
        raise HTTPException(status_code=400, detail="File too large (max 32MB)")

    file_hash = hashlib.sha256(content).hexdigest()
    vt_result = await check_virustotal_file(file_hash)
    risk = "safe" if vt_result.get("safe") else "dangerous"

    record = {
        "type": "file",
        "target": file.filename,
        "file_hash": file_hash,
        "file_size": len(content),
        "risk": risk,
        "vt_detections": vt_result.get("detections", 0),
        "vt_total": vt_result.get("total", 0),
        "scanned_at": datetime.utcnow().isoformat(),
    }
    supabase.table("scans").insert(record).execute()

    return {
        "filename": file.filename,
        "sha256": file_hash,
        "size_bytes": len(content),
        "risk": risk,
        "virustotal": vt_result,
        "scanned_at": record["scanned_at"],
    }


@app.get("/api/scans/history")
async def get_history(limit: int = 20):
    result = supabase.table("scans") \
        .select("*") \
        .order("scanned_at", desc=True) \
        .limit(limit) \
        .execute()
    return {"scans": result.data}


@app.get("/api/health")
async def health():
    return {"status": "ok"}


import asyncio  # noqa: E402 (imported at bottom to avoid circular issues)
