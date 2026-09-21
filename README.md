# ThreatLens

A web app for scanning URLs for phishing and files for malware, powered by VirusTotal, Google Safe Browsing, and a built-in YARA rule engine.

**Live demo:** https://threatlens-eight.vercel.app

---

## Features

- Scan any URL for phishing and malware threats
- Upload files for malware detection via SHA-256 hash lookup against VirusTotal
- Static malware detection via a YARA rule engine (see [`rules/`](./rules)) - catches known-bad patterns even when a file has no VirusTotal history
- Risk levels: Safe, Suspicious, and Dangerous, driven by the worst finding across all three sources
- Scan history stored in Supabase, auto-deleted every 24 hours

---

## Tech Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes (serverless)
- **Static analysis:** a zero-dependency YARA-subset parser/engine (`lib/yara/`) - see [`rules/README.md`](./rules/README.md) for why it doesn't use `libyara` directly
- **Database:** Supabase (PostgreSQL)
- **APIs:** VirusTotal, Google Safe Browsing
- **Deployment:** Vercel

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

```bash
SUPABASE_URL=your-project.supabase.co
SUPABASE_KEY=your-service-or-anon-key
VIRUSTOTAL_API_KEY=your-virustotal-key       # optional - VT checks are skipped without it
GOOGLE_SAFE_BROWSING_KEY=your-gsb-key        # optional - GSB checks are skipped without it
```

`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are also accepted as
fallbacks for `SUPABASE_URL` / `SUPABASE_KEY`, in case you're reusing values from a client-side
Supabase setup elsewhere.

### 4. Set up Supabase

Run this SQL in your Supabase SQL editor:

```sql
create table if not exists scans (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('url', 'file')),
  target        text not null,
  file_hash     text,
  file_size     bigint,
  risk          text not null check (risk in ('safe', 'suspicious', 'dangerous')),
  gsb_threats   jsonb default '[]',
  vt_detections integer default 0,
  vt_total      integer default 0,
  yara_matches  jsonb default '[]',
  scanned_at    timestamptz default now()
);

select cron.schedule(
  'clear-scans-daily',
  '0 0 * * *',
  $$delete from scans where scanned_at < now() - interval '24 hours'$$
);
```

Already running an older version of this schema? Add the new column with:

```sql
alter table scans add column if not exists yara_matches jsonb default '[]';
```

(The file-scan endpoint falls back to inserting without `yara_matches` if the column is missing, so this isn't required for the app to keep working - just to persist YARA findings in history.)

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

## YARA rules

File uploads are matched against every `.yar` file in [`rules/`](./rules) using a small
YARA-subset engine (no API key or native binary required - see
[`rules/README.md`](./rules/README.md) for what's supported and how to add your own rules).

To try it end to end without a real API key, download the official
[EICAR test file](https://www.eicar.org/download-anti-malware-testfile/) and upload it - it's a
safe, industry-standard string designed for exactly this, and `rules/eicar.yar` will flag it.

---

## Deployment

Deployed on Vercel. Add your environment variables in Vercel under Settings and Environment Variables.

---

## Built by

[Saad Mahmud](https://saadmahmud.dev)