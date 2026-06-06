// Reset script — drops all tables and storage buckets
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// Read .env manually
const env = {}
try {
  const raw = readFileSync('.env', 'utf8')
  raw.split('\n').forEach(line => {
    const [k, ...v] = line.split('=')
    if (k && v.length) env[k.trim()] = v.join('=').trim()
  })
} catch {
  console.error('Could not read .env')
  process.exit(1)
}

const SUPABASE_URL = env['VITE_SUPABASE_URL']
const SERVICE_KEY  = env['SUPABASE_SERVICE_KEY']
const PAT          = env['SUPABASE_PAT']
const PROJECT_REF  = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

if (!SUPABASE_URL || !SERVICE_KEY || !PAT || !PROJECT_REF) {
  console.error('Missing required env vars')
  process.exit(1)
}

const client = createClient(SUPABASE_URL, SERVICE_KEY)

async function managementRequest(method, path, body) {
  const res = await fetch(`https://api.supabase.com${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) } }
  catch { return { ok: res.ok, status: res.status, data: text } }
}

async function runSql(sql) {
  const res = await managementRequest('POST', `/v1/projects/${PROJECT_REF}/database/query`, { query: sql })
  if (!res.ok) throw new Error(`SQL failed: ${JSON.stringify(res.data)}`)
  return res.data
}

async function main() {
  console.log(`\nResetting project: ${PROJECT_REF}\n`)

  // 1. Drop tables
  console.log('Dropping tables...')
  await runSql(`
    DROP TABLE IF EXISTS messages CASCADE;
    DROP TABLE IF EXISTS notes CASCADE;
    DROP TABLE IF EXISTS weekly_digest CASCADE;
    DROP TABLE IF EXISTS user_settings CASCADE;
  `)
  console.log('  ✓ Tables dropped')

  // 2. Delete storage bucket contents + buckets
  const buckets = ['voice-notes', 'images', 'files']
  for (const bucket of buckets) {
    console.log(`Deleting bucket: ${bucket}...`)
    try {
      // List all files
      const { data: files } = await client.storage.from(bucket).list('', { limit: 1000 })
      if (files && files.length > 0) {
        const paths = files.map(f => f.name)
        await client.storage.from(bucket).remove(paths)
      }
      // Delete bucket via management API
      const res = await managementRequest('DELETE', `/v1/projects/${PROJECT_REF}/storage/buckets/${bucket}`)
      if (res.ok || res.status === 404) {
        console.log(`  ✓ ${bucket} deleted`)
      } else {
        console.log(`  ! ${bucket}: ${JSON.stringify(res.data)}`)
      }
    } catch (e) {
      console.log(`  ! ${bucket}: ${e.message}`)
    }
  }

  console.log('\n✓ Reset complete. All tables and buckets removed.\n')
}

main().catch(e => {
  console.error('Reset failed:', e)
  process.exit(1)
})
