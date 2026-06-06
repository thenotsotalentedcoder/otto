import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  ArrowRight, ArrowLeft, Eye, EyeSlash, CheckCircle, CircleNotch,
  WarningCircle, Copy, Check, ArrowSquareOut, LockKey, ShieldCheck,
} from '@phosphor-icons/react'
import { encryptVault, decryptVault, credsToLocalStorage } from '../../lib/vault'
import { saveVaultBlob, fetchVaultBlob } from '../../lib/supabase'

interface Props { onComplete: () => void }
type Step = 0 | 1 | 2 | 3
type SetupState = 'idle' | 'running' | 'done' | 'error'
type Mode = 'new' | 'returning'

const STEP_LABELS = ['About you', 'AI keys', 'Database', 'Vault']
const EASE = [0.16, 1, 0.3, 1] as const

// ── Full setup SQL (shown + copied in step 2) ─────────────────────────────────
const SETUP_SQL = `-- Otto database setup — run once in Supabase SQL editor

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  content text not null default '',
  type text not null default 'idea',
  source text not null default 'typed',
  link_url text, link_title text, link_summary text,
  file_path text, file_name text, file_mime text,
  transcript text,
  ai_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  content text not null default '',
  is_ask_mode boolean not null default false,
  saved boolean not null default false,
  note_id uuid references notes(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists weekly_digest (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  generated_at timestamptz not null default now()
);

create table if not exists user_settings (
  id integer primary key default 1,
  salt text not null,
  iv text not null,
  ct text not null,
  updated_at timestamptz not null default now()
);

alter table notes enable row level security;
alter table messages enable row level security;
alter table weekly_digest enable row level security;
alter table user_settings enable row level security;

drop policy if exists "allow_all_notes" on notes;
drop policy if exists "allow_all_messages" on messages;
drop policy if exists "allow_all_digest" on weekly_digest;
drop policy if exists "allow_all_settings" on user_settings;

create policy "allow_all_notes" on notes for all using (true) with check (true);
create policy "allow_all_messages" on messages for all using (true) with check (true);
create policy "allow_all_digest" on weekly_digest for all using (true) with check (true);
create policy "allow_all_settings" on user_settings for all using (true) with check (true);

insert into storage.buckets (id, name, public) values
  ('voice-notes', 'voice-notes', false),
  ('images', 'images', true),
  ('files', 'files', false)
on conflict (id) do nothing;`.trim()

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractRef(url: string): string | null {
  return url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? null
}

async function verifyConnection(url: string, anonKey: string): Promise<void> {
  if (!extractRef(url)) throw new Error('Invalid Supabase URL — expected https://xxxx.supabase.co')
  const res = await fetch(`${url}/rest/v1/notes?limit=1`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    signal: AbortSignal.timeout(10000),
  })
  if (res.status === 401) throw new Error('Invalid anon key — check Supabase → Settings → API')
  if (res.status === 404) throw new Error('Tables not found — run the SQL in the editor first')
  if (!res.ok) throw new Error(`Connection failed (${res.status}) — check your URL and anon key`)
}

// ── Button styles ─────────────────────────────────────────────────────────────
const ghostBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 10,
  padding: '11px 20px', borderRadius: 4,
  background: 'transparent', border: '1px solid rgba(255,255,255,0.16)',
  color: 'rgba(240,238,255,0.8)', fontSize: 14, fontWeight: 500,
  letterSpacing: '0.01em', cursor: 'pointer',
  transition: 'border-color 0.15s, color 0.15s, background 0.15s',
}

const accentBtn = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '10px 20px', borderRadius: 4,
  background: active ? 'rgba(139,127,245,0.14)' : 'transparent',
  border: `1px solid ${active ? 'rgba(139,127,245,0.38)' : 'rgba(255,255,255,0.07)'}`,
  color: active ? 'var(--color-accent)' : 'rgba(255,255,255,0.18)',
  fontSize: 13.5, fontWeight: 600, letterSpacing: '0.01em',
  cursor: active ? 'pointer' : 'default', transition: 'all 0.15s',
})

const backBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontSize: 13, color: 'rgba(176,168,216,0.35)',
  background: 'none', border: 'none', cursor: 'pointer',
  letterSpacing: '0.01em', padding: 0, transition: 'color 0.15s',
}

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, hint, hintHref, value, onChange, placeholder, secret, multiline, autoFocus }: {
  label: string; hint?: string; hintHref?: string; value: string
  onChange: (v: string) => void; placeholder?: string
  secret?: boolean; multiline?: boolean; autoFocus?: boolean
}) {
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'transparent', border: 'none', outline: 'none',
    color: 'rgba(240,238,255,0.88)', fontSize: 13.5, lineHeight: 1.6,
    fontFamily: secret && !show ? 'var(--font-mono)' : 'var(--font-sans)',
    resize: 'none', padding: 0,
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <label style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(176,168,216,0.4)' }}>
          {label}
        </label>
        {hint && hintHref && (
          <a href={hintHref} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--color-accent)', opacity: 0.7, textDecoration: 'none' }}>{hint}</a>
        )}
        {hint && !hintHref && (
          <span style={{ fontSize: 11, color: 'var(--color-accent)', opacity: 0.7 }}>{hint}</span>
        )}
      </div>
      <div style={{
        display: 'flex', alignItems: multiline ? 'flex-start' : 'center', gap: 8,
        padding: '10px 13px', borderRadius: 4,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${focused ? 'rgba(139,127,245,0.38)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: focused ? '0 0 0 3px rgba(139,127,245,0.07)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>
        {multiline
          ? <textarea autoFocus={autoFocus} value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={placeholder} rows={3} style={inputStyle} />
          : <input autoFocus={autoFocus} type={secret && !show ? 'password' : 'text'} value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={placeholder} style={inputStyle} />
        }
        {secret && (
          <button type="button" onClick={() => setShow(s => !s)} style={{ color: 'rgba(255,255,255,0.22)', flexShrink: 0, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
            {show ? <EyeSlash size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Step dots ─────────────────────────────────────────────────────────────────
function StepDots({ step, total }: { step: number; total: number }) {
  const labels = STEP_LABELS.slice(0, total)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 36 }}>
      {labels.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <motion.div
              animate={{
                width: i === step ? 20 : 6,
                background: i === step ? '#8b7ff5' : i < step ? 'rgba(139,127,245,0.4)' : 'rgba(255,255,255,0.12)',
              }}
              transition={{ duration: 0.3, ease: EASE }}
              style={{ height: 5, borderRadius: 2, flexShrink: 0 }}
            />
            <AnimatePresence mode="wait">
              {i === step && (
                <motion.span
                  key={`label-${i}`}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  style={{ fontSize: 10.5, color: 'var(--color-accent)', fontWeight: 500 }}
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {i < total - 1 && <div style={{ width: 10, height: 1, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  )
}

// ── SqlBlock ──────────────────────────────────────────────────────────────────
function SqlBlock({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copy = async () => {
    await navigator.clipboard.writeText(sql)
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div style={{ borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.28)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 13px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.025)' }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(176,168,216,0.3)' }}>SQL — run once</span>
        <button onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 500, color: copied ? '#5ecf8e' : 'rgba(176,168,216,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', transition: 'color 0.15s' }}>
          {copied ? <Check size={13} weight="bold" /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '12px 14px', fontSize: 11, lineHeight: 1.7, color: 'rgba(200,194,255,0.55)', fontFamily: 'var(--font-mono)', overflowX: 'auto', maxHeight: 160, overflowY: 'auto', whiteSpace: 'pre' }}>
        {sql}
      </pre>
    </div>
  )
}

// ── Step components ───────────────────────────────────────────────────────────
function StepAbout({ name, context, onName, onContext }: { name: string; context: string; onName: (v: string) => void; onContext: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', marginBottom: 6 }}>Tell Otto about you</h2>
        <p style={{ fontSize: 13, color: 'rgba(176,168,216,0.48)', lineHeight: 1.65 }}>This context is injected into every AI conversation so Otto understands you from day one.</p>
      </div>
      <Field label="Your name" value={name} onChange={onName} placeholder="e.g. Alex" autoFocus />
      <Field label="About you" value={context} onChange={onContext} placeholder="Software engineer building side projects, interested in AI..." multiline />
    </div>
  )
}

function StepAIKeys({ gemini, groq, onGemini, onGroq }: { gemini: string; groq: string; onGemini: (v: string) => void; onGroq: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', marginBottom: 6 }}>Connect your AI</h2>
        <p style={{ fontSize: 13, color: 'rgba(176,168,216,0.48)', lineHeight: 1.65 }}>Keys are stored locally and encrypted in your database — never on any server.</p>
      </div>
      <Field label="Gemini API key" hint="Get key →" hintHref="https://aistudio.google.com/app/apikey" value={gemini} onChange={onGemini} placeholder="AIza..." secret autoFocus />
      <Field label="Groq API key" hint="Get key →" hintHref="https://console.groq.com/keys" value={groq} onChange={onGroq} placeholder="gsk_..." secret />
      <div style={{ padding: '10px 13px', borderRadius: 4, background: 'rgba(139,127,245,0.05)', border: '1px solid rgba(139,127,245,0.11)' }}>
        <p style={{ fontSize: 12, color: 'rgba(176,168,216,0.42)', lineHeight: 1.6 }}>Gemini powers /ask mode. Groq transcribes voice notes. Both can be updated later in settings.</p>
      </div>
    </div>
  )
}

function StepDatabase({ url, anonKey, onUrl, onAnonKey, setupState, setupError, onVerify }: {
  url: string; anonKey: string
  onUrl: (v: string) => void; onAnonKey: (v: string) => void
  setupState: SetupState; setupError: string; onVerify: () => void
}) {
  const [guideOpen, setGuideOpen] = useState(false)
  const ref = extractRef(url.trim())
  const sqlEditorUrl = ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : null
  const canVerify = url.trim().length > 0 && anonKey.trim().length > 0 && setupState !== 'running'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', marginBottom: 6 }}>Your database</h2>
        <p style={{ fontSize: 13, color: 'rgba(176,168,216,0.48)', lineHeight: 1.65 }}>
          Your own free Supabase project — data never leaves your control.{' '}
          <span onClick={() => setGuideOpen(g => !g)} style={{ color: 'var(--color-accent)', cursor: 'pointer', opacity: 0.75 }}>
            {guideOpen ? 'Hide guide ↑' : 'How to set up ↓'}
          </span>
        </p>
      </div>

      <AnimatePresence>
        {guideOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: EASE }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '11px 14px', borderRadius: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                <span>Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)', opacity: 0.8, textDecoration: 'none' }}>supabase.com</a> and create a free project</span>,
                <span>Copy <strong style={{ color: 'rgba(220,215,255,0.55)' }}>Project URL</strong> and <strong style={{ color: 'rgba(220,215,255,0.55)' }}>anon key</strong> from Settings → API</span>,
                <span>Paste them below, copy the SQL, open the editor, run it, then verify</span>,
              ].map((content, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent)', opacity: 0.6, minWidth: 14, marginTop: 2 }}>{i + 1}.</span>
                  <span style={{ fontSize: 12, color: 'rgba(176,168,216,0.42)', lineHeight: 1.55 }}>{content}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Field label="Project URL" value={url} onChange={onUrl} placeholder="https://xxxx.supabase.co" autoFocus />
      <Field label="Anon key" value={anonKey} onChange={onAnonKey} placeholder="eyJ..." secret />
      <SqlBlock sql={SETUP_SQL} />

      {/* SQL editor link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
        {sqlEditorUrl ? (
          <a href={sqlEditorUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--color-accent)', opacity: 0.8, textDecoration: 'none', flexShrink: 0, transition: 'opacity 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
          >
            Open SQL editor <ArrowSquareOut size={12} />
          </a>
        ) : (
          <span style={{ fontSize: 12, color: 'rgba(176,168,216,0.2)', flexShrink: 0 }}>Enter URL to open editor</span>
        )}
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
      </div>

      {/* Verify button */}
      <button onClick={onVerify} disabled={!canVerify} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '11px', borderRadius: 4,
        border: `1px solid ${setupState === 'done' ? 'rgba(99,232,160,0.28)' : setupState === 'error' ? 'rgba(232,99,99,0.22)' : canVerify ? 'rgba(139,127,245,0.28)' : 'rgba(255,255,255,0.06)'}`,
        background: setupState === 'done' ? 'rgba(99,232,160,0.07)' : setupState === 'error' ? 'rgba(232,99,99,0.06)' : canVerify ? 'rgba(139,127,245,0.07)' : 'rgba(255,255,255,0.02)',
        color: setupState === 'done' ? '#5ecf8e' : setupState === 'error' ? '#e06b6b' : canVerify ? 'var(--color-accent)' : 'rgba(255,255,255,0.15)',
        fontSize: 13.5, fontWeight: 600, cursor: canVerify ? 'pointer' : 'default', transition: 'all 0.18s',
      }}>
        {setupState === 'running' && <CircleNotch size={15} style={{ animation: 'spin 1s linear infinite' }} />}
        {setupState === 'done' && <CheckCircle size={15} weight="fill" />}
        {setupState === 'idle' && 'Verify connection'}
        {setupState === 'running' && 'Verifying…'}
        {setupState === 'done' && 'Connected — ready to go'}
        {setupState === 'error' && 'Retry verification'}
      </button>

      <AnimatePresence>
        {setupState === 'error' && setupError && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            style={{ display: 'flex', gap: 8, padding: '9px 13px', borderRadius: 4, background: 'rgba(232,99,99,0.07)', border: '1px solid rgba(232,99,99,0.18)' }}
          >
            <WarningCircle size={13} style={{ color: '#e06b6b', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12, color: '#e06b6b', lineHeight: 1.5, margin: 0 }}>{setupError}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StepVault({ password, confirm, onPassword, onConfirm, vaultState, vaultError }: {
  password: string; confirm: string
  onPassword: (v: string) => void; onConfirm: (v: string) => void
  vaultState: SetupState; vaultError: string
}) {
  const match = password.length > 0 && confirm.length > 0 && password === confirm
  const mismatch = confirm.length > 0 && password !== confirm

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', marginBottom: 6 }}>Set your vault password</h2>
        <p style={{ fontSize: 13, color: 'rgba(176,168,216,0.48)', lineHeight: 1.65 }}>
          Your API keys will be encrypted with this password and stored safely in your Supabase. On a new device, enter your Supabase URL + anon key + this password to restore everything instantly.
        </p>
      </div>

      {/* Info card */}
      <div style={{ display: 'flex', gap: 10, padding: '11px 13px', borderRadius: 4, background: 'rgba(139,127,245,0.05)', border: '1px solid rgba(139,127,245,0.12)' }}>
        <ShieldCheck size={15} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 1, opacity: 0.7 }} />
        <p style={{ fontSize: 12, color: 'rgba(176,168,216,0.45)', lineHeight: 1.6, margin: 0 }}>
          This password never leaves your device. Encryption happens in your browser using AES-256. Even Supabase cannot read your keys.
        </p>
      </div>

      <Field label="Vault password" value={password} onChange={onPassword} placeholder="Choose a memorable passphrase" secret autoFocus />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Field label="Confirm password" value={confirm} onChange={onConfirm} placeholder="Repeat your passphrase" secret />
        <AnimatePresence>
          {mismatch && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ fontSize: 11.5, color: '#e06b6b', margin: 0 }}>
              Passwords don't match
            </motion.p>
          )}
          {match && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ fontSize: 11.5, color: '#5ecf8e', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={12} weight="bold" /> Passwords match
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {vaultState === 'running' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(176,168,216,0.5)' }}
          >
            <CircleNotch size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Encrypting and saving…
          </motion.div>
        )}
        {vaultState === 'error' && vaultError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', gap: 8, padding: '9px 13px', borderRadius: 4, background: 'rgba(232,99,99,0.07)', border: '1px solid rgba(232,99,99,0.18)' }}
          >
            <WarningCircle size={13} style={{ color: '#e06b6b', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12, color: '#e06b6b', lineHeight: 1.5, margin: 0 }}>{vaultError}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Returning user flow ───────────────────────────────────────────────────────
function ReturningPanel({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<SetupState>('idle')
  const [error, setError] = useState('')

  const canLogin = url.trim().length > 0 && anonKey.trim().length > 0 && password.length > 0 && state !== 'running'

  const handleLogin = async () => {
    setState('running')
    setError('')
    try {
      const blob = await fetchVaultBlob(url.trim(), anonKey.trim())
      if (!blob) throw new Error('No vault found — have you completed setup on another device first?')
      const creds = await decryptVault(blob, password)
      // Restore supabase URL + anon from the fields (not from vault, those ARE the bootstrap)
      creds.supaUrl = url.trim()
      creds.supaAnon = anonKey.trim()
      credsToLocalStorage(creds)
      // Vault password in sessionStorage for settings re-encrypt
      sessionStorage.setItem('otto_vault_pw', password)
      setState('done')
      setTimeout(onSuccess, 400)
    } catch (e) {
      setState('error')
      setError(e instanceof Error ? e.message : 'Login failed — check your credentials and password')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
      transition={{ duration: 0.25, ease: EASE }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      <div>
        <h2 style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', marginBottom: 6 }}>Welcome back</h2>
        <p style={{ fontSize: 13, color: 'rgba(176,168,216,0.48)', lineHeight: 1.65 }}>
          Enter your Supabase credentials and vault password to restore Otto on this device.
        </p>
      </div>

      <Field label="Supabase project URL" value={url} onChange={setUrl} placeholder="https://xxxx.supabase.co" autoFocus />
      <Field label="Anon key" value={anonKey} onChange={setAnonKey} placeholder="eyJ..." secret />
      <Field label="Vault password" value={password} onChange={setPassword} placeholder="Your vault passphrase" secret />

      <AnimatePresence>
        {state === 'error' && error && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            style={{ display: 'flex', gap: 8, padding: '9px 13px', borderRadius: 4, background: 'rgba(232,99,99,0.07)', border: '1px solid rgba(232,99,99,0.18)' }}
          >
            <WarningCircle size={13} style={{ color: '#e06b6b', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12, color: '#e06b6b', lineHeight: 1.5, margin: 0 }}>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <button onClick={onBack} style={backBtn}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(176,168,216,0.65)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(176,168,216,0.35)'}
        >
          <ArrowLeft size={13} weight="bold" /> Back
        </button>
        <button onClick={handleLogin} disabled={!canLogin} style={accentBtn(canLogin)}>
          {state === 'running' && <CircleNotch size={14} style={{ animation: 'spin 1s linear infinite' }} />}
          {state === 'done' && <CheckCircle size={14} weight="fill" />}
          {state === 'idle' || state === 'error' ? <><LockKey size={14} /> Unlock Otto</> : null}
          {state === 'running' ? 'Unlocking…' : state === 'done' ? 'Unlocked!' : null}
        </button>
      </div>
    </motion.div>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function OnboardingNav({ step, total, canContinue, onBack, onContinue, continueLabel }: {
  step: number; total: number; canContinue: boolean
  onBack: () => void; onContinue: () => void; continueLabel?: string
}) {
  return (
    <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <button onClick={onBack} style={backBtn}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(176,168,216,0.65)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(176,168,216,0.35)'}
      >
        <ArrowLeft size={13} weight="bold" /> Back
      </button>
      <button onClick={onContinue} disabled={!canContinue} style={accentBtn(canContinue)}>
        {continueLabel ?? (step === total - 1 ? 'Enter Otto' : 'Continue')}
        <ArrowRight size={13} weight="bold" />
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function LandingScreen({ onComplete }: Props) {
  const reduceMotion = useReducedMotion()
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  useEffect(() => {
    const fn = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  const isMobile = windowWidth < 768

  // Landing state
  const [mode, setMode] = useState<'landing' | Mode>('landing')

  // New-user onboarding state
  const [step, setStep] = useState<Step>(0)
  const [direction, setDirection] = useState(1)
  const TOTAL_STEPS = 4

  const [name, setName] = useState('')
  const [context, setContext] = useState('')
  const [gemini, setGemini] = useState('')
  const [groq, setGroq] = useState('')
  const [supaUrl, setSupaUrl] = useState('')
  const [supaAnon, setSupaAnon] = useState('')
  const [vaultPw, setVaultPw] = useState('')
  const [vaultConfirm, setVaultConfirm] = useState('')

  const [setupState, setSetupState] = useState<SetupState>('idle')
  const [setupError, setSetupError] = useState('')
  const [vaultState, setVaultState] = useState<SetupState>('idle')
  const [vaultError, setVaultError] = useState('')

  const vaultMatch = vaultPw.length > 0 && vaultPw === vaultConfirm

  const canContinue = [
    name.trim().length > 0,
    gemini.trim().length > 0,
    setupState === 'done',
    vaultMatch && vaultState !== 'running',
  ][step]

  const goTo = (next: Step) => { setDirection(next > step ? 1 : -1); setStep(next) }
  const handleBack = () => {
    if (step > 0) goTo((step - 1) as Step)
    else setMode('landing')
  }

  const handleVerify = async () => {
    setSetupState('running')
    setSetupError('')
    try {
      await verifyConnection(supaUrl.trim(), supaAnon.trim())
      setSetupState('done')
    } catch (e) {
      setSetupState('error')
      setSetupError(e instanceof Error ? e.message : 'Verification failed')
    }
  }

  const handleContinue = async () => {
    if (step < TOTAL_STEPS - 1) {
      goTo((step + 1) as Step)
      return
    }
    // Final step — encrypt and save vault, then enter app
    setVaultState('running')
    setVaultError('')
    try {
      const creds = { name: name.trim(), context: context.trim(), gemini: gemini.trim(), groq: groq.trim(), supaUrl: supaUrl.trim(), supaAnon: supaAnon.trim() }
      const blob = await encryptVault(creds, vaultPw)
      await saveVaultBlob(supaUrl.trim(), supaAnon.trim(), blob)
      credsToLocalStorage(creds)
      sessionStorage.setItem('otto_vault_pw', vaultPw)
      onComplete()
    } catch (e) {
      setVaultState('error')
      setVaultError(e instanceof Error ? e.message : 'Failed to save vault — check your Supabase connection')
    }
  }

  const fade = (delay: number) =>
    reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2, delay } }
      : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay, ease: EASE } }

  const stepVariants = {
    enter: (d: number) => ({ opacity: 0, x: reduceMotion ? 0 : d * 18 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduceMotion ? 0 : d * -18 }),
  }

  const started = mode === 'new'

  const onboardingPanel = (
    <>
      <StepDots step={step} total={TOTAL_STEPS} />
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div key={step} custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: EASE }}>
          {step === 0 && <StepAbout name={name} context={context} onName={setName} onContext={setContext} />}
          {step === 1 && <StepAIKeys gemini={gemini} groq={groq} onGemini={setGemini} onGroq={setGroq} />}
          {step === 2 && <StepDatabase url={supaUrl} anonKey={supaAnon} onUrl={setSupaUrl} onAnonKey={setSupaAnon} setupState={setupState} setupError={setupError} onVerify={handleVerify} />}
          {step === 3 && <StepVault password={vaultPw} confirm={vaultConfirm} onPassword={setVaultPw} onConfirm={setVaultConfirm} vaultState={vaultState} vaultError={vaultError} />}
        </motion.div>
      </AnimatePresence>
      <OnboardingNav step={step} total={TOTAL_STEPS} canContinue={canContinue} onBack={handleBack} onContinue={handleContinue}
        continueLabel={step === TOTAL_STEPS - 1 ? (vaultState === 'running' ? 'Saving…' : 'Enter Otto') : undefined}
      />
    </>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(160deg, rgba(4,3,14,0.52) 0%, rgba(5,4,16,0.7) 50%, rgba(3,2,12,0.87) 100%)' }} />

      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: isMobile ? '0 28px' : '0 9vw', overflowY: 'auto' }}>

        {/* Hero — always left */}
        <motion.div layout="position" transition={{ duration: 0.45, ease: EASE }} style={{ flex: 1, maxWidth: 400, paddingTop: 40, paddingBottom: 40, flexShrink: 0 }}>
          <motion.div {...fade(0.05)} style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-accent)', opacity: 0.85 }}>Personal AI · Private by design</span>
          </motion.div>

          <motion.h1 {...fade(0.12)} style={{ fontSize: 'clamp(64px, 11vw, 92px)', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.9, marginBottom: 28, background: 'linear-gradient(160deg, #ffffff 0%, #e8e2ff 45%, #8b7ff5 85%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            otto
          </motion.h1>

          <motion.p {...fade(0.2)} style={{ fontSize: 15.5, lineHeight: 1.75, color: 'rgba(220,215,255,0.62)', marginBottom: 40, maxWidth: 310 }}>
            Your thoughts, links, and voice notes —{' '}remembered, connected, and always ready to surface.
          </motion.p>

          <motion.div {...fade(0.26)} style={{ width: 32, height: 1, background: 'rgba(139,127,245,0.32)', marginBottom: 28 }} />

          <motion.div {...fade(0.3)} style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 44 }}>
            {['Bring your own Gemini & Groq keys', 'Your Supabase — your data, zero lock-in', 'Encrypted vault — restore on any device in seconds'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0, marginTop: 9, opacity: 0.5 }} />
                <span style={{ fontSize: 13.5, color: 'rgba(176,168,216,0.52)', lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            animate={{ opacity: started && !isMobile ? 0 : 1, pointerEvents: started && !isMobile ? 'none' : 'auto' }}
            transition={{ duration: 0.2 }}
            {...(mode === 'landing' ? fade(0.38) : {})}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <button onClick={() => { setMode('new'); setStep(0) }} style={ghostBtn}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(139,127,245,0.45)'; el.style.background = 'rgba(139,127,245,0.07)'; el.style.color = '#fff' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.16)'; el.style.background = 'transparent'; el.style.color = 'rgba(240,238,255,0.8)' }}
            >
              Get started with Otto <ArrowRight size={14} weight="bold" />
            </button>
            <button onClick={() => setMode('returning')} style={{ ...ghostBtn, padding: '9px 20px', fontSize: 13, borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(176,168,216,0.45)' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.18)'; el.style.color = 'rgba(176,168,216,0.7)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.08)'; el.style.color = 'rgba(176,168,216,0.45)' }}
            >
              I already have Otto <ArrowRight size={13} weight="bold" />
            </button>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.6 }}
            style={{ marginTop: 18, fontSize: 11.5, color: 'rgba(107,100,148,0.55)', letterSpacing: '0.01em' }}
          >
            Bring your own API keys · Your data stays yours
          </motion.p>
        </motion.div>

        {/* Desktop right panel */}
        {!isMobile && (
          <AnimatePresence>
            {mode === 'new' && (
              <motion.div key="new"
                initial={{ opacity: 0, x: 32, flexBasis: 0, minWidth: 0 }}
                animate={{ opacity: 1, x: 0, flexBasis: '44%', minWidth: 280 }}
                exit={{ opacity: 0, x: 0, flexBasis: 0, minWidth: 0, transition: { opacity: { duration: 0.18 }, flexBasis: { duration: 0.35, ease: EASE, delay: 0.12 }, minWidth: { duration: 0.35, ease: EASE, delay: 0.12 } } }}
                transition={{ duration: 0.45, ease: EASE }}
                style={{ flexShrink: 0, overflow: 'hidden', paddingLeft: 72, paddingTop: 40, paddingBottom: 40 }}
              >
                {onboardingPanel}
              </motion.div>
            )}
            {mode === 'returning' && (
              <motion.div key="returning"
                initial={{ opacity: 0, x: 32, flexBasis: 0, minWidth: 0 }}
                animate={{ opacity: 1, x: 0, flexBasis: '44%', minWidth: 280 }}
                exit={{ opacity: 0, x: 0, flexBasis: 0, minWidth: 0, transition: { opacity: { duration: 0.18 }, flexBasis: { duration: 0.35, ease: EASE, delay: 0.12 }, minWidth: { duration: 0.35, ease: EASE, delay: 0.12 } } }}
                transition={{ duration: 0.45, ease: EASE }}
                style={{ flexShrink: 0, overflow: 'hidden', paddingLeft: 72, paddingTop: 40, paddingBottom: 40 }}
              >
                <ReturningPanel onSuccess={onComplete} onBack={() => setMode('landing')} />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Mobile overlay */}
        {isMobile && (
          <AnimatePresence>
            {(mode === 'new' || mode === 'returning') && (
              <motion.div key={mode}
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.3, ease: EASE }}
                style={{ position: 'fixed', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 28px', overflowY: 'auto', background: 'rgba(3,2,12,0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
              >
                <div style={{ width: '100%', maxWidth: 400, paddingTop: 40, paddingBottom: 40 }}>
                  {mode === 'new' && onboardingPanel}
                  {mode === 'returning' && <ReturningPanel onSuccess={onComplete} onBack={() => setMode('landing')} />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

      </div>
    </div>
  )
}
