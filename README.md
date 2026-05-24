# ThreatLens

A web app for scanning URLs for phishing and files for malware, powered by VirusTotal and Google Safe Browsing.

**Live demo:** https://threatlens-nine.vercel.app

---

## Features

- Scan any URL for phishing and malware threats
- Upload files for malware detection via SHA-256 hash lookup
- Risk levels: Safe, Suspicious, and Dangerous with visual warnings
- Scan history stored in Supabase
- Cyberpunk terminal UI

---

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes (serverless)
- **Database:** Supabase (PostgreSQL)
- **APIs:** VirusTotal, Google Safe Browsing
- **Deployment:** Vercel

---

## Screenshots

> Add screenshots here

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/wolv1ee/threatlens.git
cd threatlens
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
VIRUSTOTAL_API_KEY=your-virustotal-key
GOOGLE_SAFE_BROWSING_KEY=your-google-key
```

### 4. Set up Supabase

Run this SQL in your Supabase SQL editor:

```sql
create table if not exists scans (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('url', 'file')),
  target      text not null,
  file_hash   text,
  file_size   bigint,
  risk        text not null check (risk in ('safe', 'suspicious', 'dangerous')),
  gsb_threats jsonb default '[]',
  vt_detections integer default 0,
  vt_total    integer default 0,
  scanned_at  timestamptz default now()
);
```

### 5. Run locally

```bash
npm run dev
```

Open http://localhost:3000

---

## API Keys

| Service | Link | Free Tier |
|---|---|---|
| VirusTotal | https://www.virustotal.com | 500 requests/day |
| Google Safe Browsing | https://developers.google.com/safe-browsing | Free |
| Supabase | https://supabase.com | Free tier available |

---

## Deployment

Deployed on Vercel. Add your environment variables in Vercel's dashboard under Settings and environment variables.
