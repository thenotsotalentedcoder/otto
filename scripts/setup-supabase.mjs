/**
 * Otto — Supabase Setup Script
 * Usage: node scripts/setup-supabase.mjs
 *
 * Requires .env in project root with:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

// Load .env manually (no dotenv dependency needed)
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => l.split('=').map(p => p.trim()))
    .filter(([k]) => k)
    .map(([k, ...v]) => [k, v.join('=')])
)

const SUPABASE_URL = env.VITE_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_KEY
const PAT = env.SUPABASE_PAT

if (!SUPABASE_URL || !SERVICE_KEY || !PAT) {
  console.error('❌  Missing VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY, or SUPABASE_PAT in .env')
  process.exit(1)
}

// Extract project ref from URL: https://<ref>.supabase.co
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0]

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// ── SQL to execute ─────────────────────────────────────────────────────────────

const SQL = `
-- note_type enum
DO $$ BEGIN
  CREATE TYPE note_type AS ENUM (
    'idea', 'link', 'code', 'decision', 'voice', 'image', 'file'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- note_source enum
DO $$ BEGIN
  CREATE TYPE note_source AS ENUM (
    'typed', 'voice', 'share_sheet', 'image_upload', 'file_upload'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- message_role enum
DO $$ BEGIN
  CREATE TYPE message_role AS ENUM ('user', 'assistant');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- notes: the core knowledge store
CREATE TABLE IF NOT EXISTS notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content       text NOT NULL,
  type          note_type NOT NULL DEFAULT 'idea',
  source        note_source NOT NULL DEFAULT 'typed',
  link_url      text,
  link_title    text,
  link_summary  text,
  file_path     text,
  file_name     text,
  file_mime     text,
  transcript    text,
  ai_tags       text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- messages: the one continuous chat thread
CREATE TABLE IF NOT EXISTS messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role          message_role NOT NULL,
  content       text NOT NULL,
  is_ask_mode   boolean NOT NULL DEFAULT false,
  saved         boolean NOT NULL DEFAULT false,
  note_id       uuid REFERENCES notes(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- weekly_digest: single row, overwritten every 7 days
CREATE TABLE IF NOT EXISTS weekly_digest (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content       text NOT NULL,
  generated_at  timestamptz NOT NULL DEFAULT now()
);

-- indexes for fast retrieval
CREATE INDEX IF NOT EXISTS notes_created_at_idx  ON notes (created_at DESC);
CREATE INDEX IF NOT EXISTS notes_type_idx        ON notes (type);
CREATE INDEX IF NOT EXISTS notes_ai_tags_idx     ON notes USING GIN (ai_tags);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at ASC);
CREATE INDEX IF NOT EXISTS messages_note_id_idx  ON messages (note_id);

-- disable RLS — single user app, always accessed via service key
ALTER TABLE notes          DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages       DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_digest  DISABLE ROW LEVEL SECURITY;
`

// ── Run SQL via Supabase Management API ───────────────────────────────────────

async function runSQL() {
  console.log('  Running SQL via Management API...')
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PAT}`,
      },
      body: JSON.stringify({ query: SQL }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Management API failed (${res.status}): ${text}`)
  }

  return res.json()
}

// ── Storage buckets ────────────────────────────────────────────────────────────

const BUCKETS = [
  {
    name: 'voice-notes',
    public: false,
    allowedMimeTypes: ['audio/webm', 'audio/wav', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/flac', 'audio/m4a'],
    fileSizeLimit: 25 * 1024 * 1024,
  },
  {
    name: 'images',
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    fileSizeLimit: 50 * 1024 * 1024,
  },
  {
    name: 'files',
    public: false,
    allowedMimeTypes: [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    fileSizeLimit: 50 * 1024 * 1024,
  },
]

async function createBuckets() {
  for (const bucket of BUCKETS) {
    const { error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
      allowedMimeTypes: bucket.allowedMimeTypes,
      fileSizeLimit: bucket.fileSizeLimit,
    })
    if (error && !error.message.toLowerCase().includes('already exists')) {
      console.error(`  ✗ bucket "${bucket.name}": ${error.message}`)
    } else {
      console.log(`  ✓ bucket: ${bucket.name}${error ? ' (already existed)' : ''}`)
    }
  }
}

// ── Verify tables exist ────────────────────────────────────────────────────────

async function verifyTables() {
  const tables = ['notes', 'messages', 'weekly_digest']
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1)
    if (error) {
      console.error(`  ✗ table "${table}": ${error.message}`)
    } else {
      console.log(`  ✓ table: ${table}`)
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔧  Otto — Supabase Setup')
  console.log(`    Project: ${PROJECT_REF}\n`)

  // SQL
  console.log('1. Creating tables & enums...')
  try {
    await runSQL()
    console.log('  ✓ Tables and enums created')
  } catch (e) {
    console.error(`  ✗ ${e.message}`)
    process.exit(1)
  }

  // Buckets
  console.log('\n2. Creating storage buckets...')
  await createBuckets()

  // Verify
  console.log('\n3. Verifying tables...')
  await verifyTables()

  console.log('\n✅  Setup complete!\n')
}

main().catch(e => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
