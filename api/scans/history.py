from fastapi import FastAPI

from api._lib import supabase

app = FastAPI()


@app.get("/")
def handler(limit: int = 20):
    result = (
        supabase.table("scans")
        .select("*")
        .order("scanned_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"scans": result.data}
