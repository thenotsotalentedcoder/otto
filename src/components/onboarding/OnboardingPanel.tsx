import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { ArrowRight, ArrowLeft, Eye, EyeSlash, CheckCircle, CircleNotch, WarningCircle } from '@phosphor-icons/react'

interface Props {
  onComplete: () => void
}

type Step = 0 | 1 | 2
type SetupState = 'idle' | 'running' | 'done' | 'error'

const STEP_LABELS = ['About you', 'AI keys', 'Database']

// ── Supabase setup via Management API ────────────────────────────────────────

function extractProjectRef(url: string): string | null {
  const m = url.match(/https:\/\/([^.]+)\.supabase\.co/)
  return m ? m[1] : null
}

async function mgmt(pat: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`https://api.supabase.com${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = text }
  return { ok: res.ok, status: res.status, data }
}

async function runSupabaseSetup(url: string, anonKey: string, pat: string): Promise<void> {
  const ref = extractProjectRef(url)
  if (!ref) throw new Error('Invalid Supabase URL — expected https://<ref>.supabase.co')

  // Create tables via SQL
  const sql = `
    CREATE TABLE IF NOT EXISTS notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      content text NOT NULL DEFAULT '',
      type text NOT NULL DEFAULT 'idea',
      source text NOT NULL DEFAULT 'typed',
      link_url text,
      link_title text,
      link_summary text,
      file_path text,
      file_name text,
      file_mime text,
      transcript text,
      ai_tags text[] NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      role text NOT NULL,
      content text NOT NULL DEFAULT '',
      is_ask_mode boolean NOT NULL DEFAULT false,
      saved boolean NOT NULL DEFAULT false,
      note_id uuid REFERENCES notes(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS weekly_digest (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      content text NOT NULL,
      generated_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE weekly_digest ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "allow_all_notes" ON notes;
    DROP POLICY IF EXISTS "allow_all_messages" ON messages;
    DROP POLICY IF EXISTS "allow_all_digest" ON weekly_digest;

    CREATE POLICY "allow_all_notes" ON notes FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "allow_all_messages" ON messages FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "allow_all_digest" ON weekly_digest FOR ALL USING (true) WITH CHECK (true);
  `

  const sqlRes = await mgmt(pat, 'POST', `/v1/projects/${ref}/database/query`, { query: sql })
  if (!sqlRes.ok) throw new Error(`Table setup failed: ${JSON.stringify(sqlRes.data)}`)

  // Create storage buckets
  for (const [id, isPublic] of [['voice-notes', false], ['images', true], ['files', false]] as [string, boolean][]) {
    const res = await mgmt(pat, 'POST', `/v1/projects/${ref}/storage/buckets`, {
      id, name: id, public: isPublic, file_size_limit: 52428800,
    })
    // 409 = already exists, that's fine
    if (!res.ok && res.status !== 409) {
      console.warn(`Bucket ${id} failed:`, res.data)
    }
  }

  // Verify connection with anon key
  const verifyRes = await fetch(`${url}/rest/v1/notes?limit=1`, {
    headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` },
  })
  if (!verifyRes.ok) throw new Error('Connection verify failed — check your URL and anon key')
}

// ── Field ────────────────────────────────────────────────────────────────────

function Field({ label, hint, onHint, value, onChange, placeholder, secret, multiline }: {
  label: string; hint?: string; onHint?: () => void; value: string
  onChange: (v: string) => void; placeholder?: string; secret?: boolean; multiline?: boolean
}) {
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'transparent', border: 'none', outline: 'none',
    color: 'var(--color-text-primary)', fontSize: 13.5, lineHeight: 1.6,
    fontFamily: secret && !show ? 'var(--font-mono)' : 'var(--font-sans)',
    resize: 'none', padding: 0,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(176,168,216,0.5)' }}>
          {label}
        </label>
        {hint && (
          <span onClick={onHint} style={{ fontSize: 11, color: 'var(--color-accent)', cursor: onHint ? 'pointer' : 'default', opacity: 0.8 }}>
            {hint}
          </span>
        )}
      </div>
      <div style={{
        display: 'flex', alignItems: multiline ? 'flex-start' : 'center', gap: 8,
        padding: '10px 14px', borderRadius: 11,
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${focused ? 'rgba(139,127,245,0.45)' : 'rgba(255,255,255,0.1)'}`,
        boxShadow: focused ? '0 0 0 3px rgba(139,127,245,0.1)' : 'none',
        transition: 'border-color 0.18s, box-shadow 0.18s',
      }}>
        {multiline
          ? <textarea value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={placeholder} rows={3} style={inputStyle} />
          : <input type={secret && !show ? 'password' : 'text'} value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={placeholder} style={inputStyle} />
        }
        {secret && (
          <button type="button" onClick={() => setShow(s => !s)} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
            {show ? <EyeSlash size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Step dots ─────────────────────────────────────────────────────────────────

function StepDots({ step }: { step: Step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 40 }}>
      {STEP_LABELS.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: i === step ? 20 : 6, height: 6, borderRadius: 3,
              background: i === step ? 'var(--color-accent)' : i < step ? 'rgba(139,127,245,0.4)' : 'rgba(255,255,255,0.12)',
              transition: 'width 0.3s ease, background 0.3s ease',
            }} />
            {i === step && (
              <span style={{ fontSize: 10.5, color: 'var(--color-accent)', fontWeight: 500 }}>
                {label}
              </span>
            )}
          </div>
          {i < 2 && <div style={{ width: 12, height: 1, background: 'rgba(255,255,255,0.08)' }} />}
        </div>
      ))}
    </div>
  )
}

// ── Steps ─────────────────────────────────────────────────────────────────────

function StepAbout({ name, context, onName, onContext }: {
  name: string; context: string; onName: (v: string) => void; onContext: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', marginBottom: 6 }}>Tell Otto about you</h2>
        <p style={{ fontSize: 13.5, color: 'rgba(176,168,216,0.55)', lineHeight: 1.6 }}>
          This context is injected into every AI conversation so Otto understands you from day one.
        </p>
      </div>
      <Field label="Your name" value={name} onChange={onName} placeholder="e.g. Alex" />
      <Field label="About you" value={context} onChange={onContext} placeholder="e.g. Software engineer building side projects, interested in AI and productivity..." multiline />
    </div>
  )
}

function StepAIKeys({ gemini, groq, onGemini, onGroq }: {
  gemini: string; groq: string; onGemini: (v: string) => void; onGroq: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', marginBottom: 6 }}>Connect your AI</h2>
        <p style={{ fontSize: 13.5, color: 'rgba(176,168,216,0.55)', lineHeight: 1.6 }}>
          Keys are stored locally on your device only — never sent to any server.
        </p>
      </div>
      <Field
        label="Gemini API key"
        hint="Get key →"
        onHint={() => window.open('https://aistudio.google.com/app/apikey', '_blank')}
        value={gemini} onChange={onGemini} placeholder="AIza..." secret
      />
      <Field
        label="Groq API key"
        hint="Get key →"
        onHint={() => window.open('https://console.groq.com/keys', '_blank')}
        value={groq} onChange={onGroq} placeholder="gsk_..." secret
      />
      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(139,127,245,0.07)', border: '1px solid rgba(139,127,245,0.14)' }}>
        <p style={{ fontSize: 12, color: 'rgba(176,168,216,0.5)', lineHeight: 1.6 }}>
          Gemini powers /ask and auto-tagging. Groq transcribes voice notes. Both can be updated anytime in settings.
        </p>
      </div>
    </div>
  )
}

function StepDatabase({ url, anonKey, pat, onUrl, onAnonKey, onPat, setupState, setupError, onRunSetup }: {
  url: string; anonKey: string; pat: string
  onUrl: (v: string) => void; onAnonKey: (v: string) => void; onPat: (v: string) => void
  setupState: SetupState; setupError: string; onRunSetup: () => void
}) {
  const [guideOpen, setGuideOpen] = useState(false)
  const canRun = url.trim() && anonKey.trim() && pat.trim() && setupState !== 'running' && setupState !== 'done'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', marginBottom: 6 }}>Your database</h2>
        <p style={{ fontSize: 13.5, color: 'rgba(176,168,216,0.55)', lineHeight: 1.6 }}>
          Your own free Supabase project — data never leaves your control.{' '}
          <span onClick={() => setGuideOpen(g => !g)} style={{ color: 'var(--color-accent)', cursor: 'pointer' }}>
            {guideOpen ? 'Hide ↑' : 'How to set up ↓'}
          </span>
        </p>
      </div>

      <AnimatePresence>
        {guideOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                'Go to supabase.com → New project',
                'Settings → API → copy Project URL and anon key',
                'Settings → Access tokens → Create a Personal Access Token',
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent)', opacity: 0.7, minWidth: 14, marginTop: 2 }}>{i + 1}.</span>
                  <span style={{ fontSize: 12, color: 'rgba(176,168,216,0.5)', lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Field label="Project URL" value={url} onChange={onUrl} placeholder="https://xxxx.supabase.co" />
      <Field label="Anon key" value={anonKey} onChange={onAnonKey} placeholder="eyJ..." secret />
      <Field
        label="Personal Access Token"
        hint="What's this? ↓"
        onHint={() => setGuideOpen(true)}
        value={pat} onChange={onPat} placeholder="sbp_..." secret
      />

      {setupError && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(232,99,99,0.08)', border: '1px solid rgba(232,99,99,0.2)' }}>
          <WarningCircle size={14} style={{ color: '#e06b6b', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#e06b6b', lineHeight: 1.5 }}>{setupError}</p>
        </div>
      )}

      <button
        onClick={onRunSetup}
        disabled={!canRun}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '11px', borderRadius: 11,
          border: '1px solid rgba(139,127,245,0.25)',
          background: setupState === 'done' ? 'rgba(99,232,160,0.1)' : setupState === 'error' ? 'rgba(232,99,99,0.1)' : 'rgba(139,127,245,0.1)',
          color: setupState === 'done' ? '#5ecf8e' : setupState === 'error' ? '#e06b6b' : 'var(--color-accent)',
          fontSize: 13.5, fontWeight: 600,
          cursor: canRun ? 'pointer' : 'default',
          opacity: !canRun && setupState === 'idle' ? 0.5 : 1,
          transition: 'all 0.2s', marginTop: 2,
        }}
      >
        {setupState === 'running' && <CircleNotch size={15} style={{ animation: 'spin 1s linear infinite' }} />}
        {setupState === 'done' && <CheckCircle size={15} weight="fill" />}
        {setupState === 'idle' && 'Set up Otto\'s memory'}
        {setupState === 'running' && 'Setting up…'}
        {setupState === 'done' && 'All set — ready to go'}
        {setupState === 'error' && 'Retry setup'}
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function OnboardingPanel({ onComplete }: Props) {
  const reduceMotion = useReducedMotion()
  const [step, setStep] = useState<Step>(0)
  const [direction, setDirection] = useState(1)

  const [name, setName] = useState('')
  const [context, setContext] = useState('')
  const [gemini, setGemini] = useState('')
  const [groq, setGroq] = useState('')
  const [supaUrl, setSupaUrl] = useState('')
  const [supaAnon, setSupaAnon] = useState('')
  const [supaPat, setSupaPat] = useState('')
  const [setupState, setSetupState] = useState<SetupState>('idle')
  const [setupError, setSetupError] = useState('')

  const canContinue = [
    name.trim().length > 0,
    gemini.trim().length > 0,
    setupState === 'done',
  ][step]

  const goTo = (next: Step) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  const handleRunSetup = async () => {
    setSetupState('running')
    setSetupError('')
    try {
      await runSupabaseSetup(supaUrl.trim(), supaAnon.trim(), supaPat.trim())
      setSetupState('done')
    } catch (e) {
      setSetupState('error')
      setSetupError(e instanceof Error ? e.message : 'Setup failed — check your keys and try again')
    }
  }

  const handleContinue = () => {
    if (step < 2) {
      goTo((step + 1) as Step)
    } else {
      // Persist all keys to localStorage
      localStorage.setItem('otto_name', name.trim())
      localStorage.setItem('otto_context', context.trim())
      localStorage.setItem('otto_gemini_key', gemini.trim())
      localStorage.setItem('otto_groq_key', groq.trim())
      localStorage.setItem('otto_supa_url', supaUrl.trim())
      localStorage.setItem('otto_supa_anon', supaAnon.trim())
      onComplete()
    }
  }

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduceMotion ? 0 : d * 20 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduceMotion ? 0 : d * -20 }),
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(160deg, rgba(4,3,14,0.55) 0%, rgba(5,4,16,0.72) 50%, rgba(3,2,12,0.88) 100%)',
      }} />

      <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 32px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 400, paddingTop: 40, paddingBottom: 40 }}>

          <StepDots step={step} />

          <div style={{ position: 'relative' }}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              >
                {step === 0 && <StepAbout name={name} context={context} onName={setName} onContext={setContext} />}
                {step === 1 && <StepAIKeys gemini={gemini} groq={groq} onGemini={setGemini} onGroq={setGroq} />}
                {step === 2 && (
                  <StepDatabase
                    url={supaUrl} anonKey={supaAnon} pat={supaPat}
                    onUrl={setSupaUrl} onAnonKey={setSupaAnon} onPat={setSupaPat}
                    setupState={setupState} setupError={setupError} onRunSetup={handleRunSetup}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 36 }}>
            {step > 0 ? (
              <button onClick={() => goTo((step - 1) as Step)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(176,168,216,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <ArrowLeft size={13} /> Back
              </button>
            ) : <div />}

            <motion.button
              onClick={handleContinue}
              disabled={!canContinue}
              whileHover={canContinue ? { scale: 1.03 } : {}}
              whileTap={canContinue ? { scale: 0.97 } : {}}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 22px', borderRadius: 12,
                background: canContinue ? 'var(--color-accent)' : 'rgba(255,255,255,0.06)',
                border: 'none',
                color: canContinue ? '#fff' : 'rgba(255,255,255,0.2)',
                fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
                cursor: canContinue ? 'pointer' : 'default',
                transition: 'all 0.2s',
                boxShadow: canContinue ? '0 0 24px rgba(139,127,245,0.3)' : 'none',
              }}
            >
              {step === 2 ? 'Enter Otto' : 'Continue'}
              <ArrowRight size={14} weight="bold" />
            </motion.button>
          </div>

          {step === 1 && (
            <p onClick={() => goTo(2)} style={{ marginTop: 16, fontSize: 12, color: 'rgba(107,100,148,0.6)', cursor: 'pointer', textAlign: 'right' }}>
              Skip for now — add keys later in settings
            </p>
          )}

        </div>
      </div>
    </div>
  )
}
