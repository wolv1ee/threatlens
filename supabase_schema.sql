-- Run this in your Supabase SQL editor

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

-- Index for fast history queries
create index on scans (scanned_at desc);

-- Enable Row Level Security (optional - remove if no auth)
alter table scans enable row level security;

-- Allow anonymous reads and inserts (adjust as needed)
create policy "Allow all" on scans for all using (true) with check (true);
