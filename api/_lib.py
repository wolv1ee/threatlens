import os
import base64
import hashlib
import asyncio
from datetime import datetime

import httpx
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")
GOOGLE_SAFE_BROWSING_KEY = os.getenv("GOOGLE_SAFE_BROWSING_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


async def check_google_safe_browsing(url: str) -> dict:
    if not GOOGLE_SAFE_BROWSING_KEY:
        return {
            "safe": True,
            "threats": [],
            "source": "google_safe_browsing",
            "skipped": True,
        }

    payload = {
        "client": {"clientId": "malware-analyzer", "clientVersion": "1.0"},
        "threatInfo": {
            "threatTypes": [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE",
                "POTENTIALLY_HARMFUL_APPLICATION",
            ],
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
    if not VIRUSTOTAL_API_KEY:
        return {
            "safe": True,
            "detections": 0,
            "total": 0,
            "source": "virustotal",
            "skipped": True,
        }

    headers = {"x-apikey": VIRUSTOTAL_API_KEY}
    encoded_url = base64.urlsafe_b64encode(url.encode()).decode().rstrip("=")

    async with httpx.AsyncClient() as client:
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

        submit = await client.post(
            "https://www.virustotal.com/api/v3/urls",
            headers=headers,
            data={"url": url},
            timeout=15,
        )
        if submit.status_code == 200:
            return {
                "safe": True,
                "detections": 0,
                "total": 0,
                "source": "virustotal",
                "pending": True,
            }

    return {"safe": True, "detections": 0, "total": 0, "source": "virustotal", "error": True}


async def check_virustotal_file(file_hash: str) -> dict:
    if not VIRUSTOTAL_API_KEY:
        return {
            "safe": True,
            "detections": 0,
            "total": 0,
            "source": "virustotal",
            "skipped": True,
        }

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
