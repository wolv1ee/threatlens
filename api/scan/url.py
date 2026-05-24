import asyncio
from datetime import datetime

from fastapi import FastAPI
from pydantic import BaseModel

from api._lib import (
    check_google_safe_browsing,
    check_virustotal_url,
    determine_risk,
    supabase,
)

app = FastAPI()


class URLRequest(BaseModel):
    url: str


@app.post("/")
async def handler(req: URLRequest):
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
