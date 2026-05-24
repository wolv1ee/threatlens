import hashlib
from datetime import datetime

from fastapi import FastAPI, File, HTTPException, UploadFile

from api._lib import check_virustotal_file, determine_risk, supabase

app = FastAPI()


@app.post("/")
async def handler(file: UploadFile = File(...)):
    content = await file.read()
    if len(content) > 32 * 1024 * 1024:
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
        "risk": risk,
        "virustotal": vt_result,
        "scanned_at": record["scanned_at"],
    }
