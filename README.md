# ThreatLens — Malware & Phishing Analyzer

A web app to scan URLs for phishing and files for malware using VirusTotal and Google Safe Browsing, with scan history stored in Supabase.

---

## Stack
- **Backend:** Python + FastAPI
- **Frontend:** React + TypeScript + Tailwind
- **Database:** Supabase (PostgreSQL)
- **APIs:** VirusTotal, Google Safe Browsing

---

## Setup

### 1. Supabase
1. Create a project at https://supabase.com
2. Go to SQL Editor and run `supabase_schema.sql`
3. Copy your project URL and anon key

### 2. API Keys
- **VirusTotal:** https://www.virustotal.com/gui/my-apikey (free)
- **Google Safe Browsing:** https://developers.google.com/safe-browsing/v4/get-started (free)

### 3. Backend
```bash
cd backend
cp .env.example .env
# Fill in your keys in .env

pip install -r requirements.txt
uvicorn main:app --reload
# Runs at http://localhost:8000
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:5173
```

---

## Features
- 🔗 **URL scanning** — checks against Google Safe Browsing + VirusTotal
- 📁 **File scanning** — SHA-256 hash lookup via VirusTotal
- 🚨 **Risk levels** — Safe / Suspicious / Dangerous with visual warnings
- 📋 **Scan history** — all results persisted in Supabase
- 🎨 **Cyberpunk UI** — dark terminal aesthetic

---

## Project Structure
```
malware-app/
├── backend/
│   ├── main.py          # FastAPI app
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/       # ScanPage, HistoryPage
│   │   ├── components/  # Layout
│   │   └── lib/api.ts   # API calls
│   └── package.json
└── supabase_schema.sql
```
# threatlens
