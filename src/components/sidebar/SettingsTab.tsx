import { useState } from 'react'
import { Eye, EyeSlash, CheckCircle, CircleNotch, WarningCircle, SignOut, LockKey } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'motion/react'
import { encryptVault, decryptVault, credsFromLocalStorage, credsToLocalStorage } from '../../lib/vault'
import { saveVaultBlob, fetchVaultBlob } from '../../lib/supabase'
import { keys } from '../../lib/keys'

type SaveState = 'idle' | 'running' | 'done' | 'error'

// ── Reusable field ────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, secret, multiline }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; secret?: boolean; multiline?: boolean
}) {
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'transparent', border: 'none', outline: 'none',
    color: 'rgba(240,238,255,0.88)', fontSize: 13, lineHeight: 1.6,
    fontFamily: secret && !show ? 'var(--font-mono)' : 'var(--font-sans)',
    resize: 'none', padding: 0,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(176,168,216,0.35)' }}>
        {label}
      </label>
      <div style={{
        display: 'flex', alignItems: multiline ? 'flex-start' : 'center', gap: 8,
        padding: '9px 12px', borderRadius: 6,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${focused ? 'rgba(139,127,245,0.35)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: focused ? '0 0 0 3px rgba(139,127,245,0.06)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>
        {multiline
          ? <textarea value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={placeholder} rows={3} style={inputStyle} />
          : <input type={secret && !show ? 'password' : 'text'} value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={placeholder} style={inputStyle} />
        }
        {secret && (
          <button type="button" onClick={() => setShow(s => !s)} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
            {show ? <EyeSlash size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function Section({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(139,127,245,0.5)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(139,127,245,0.1)' }} />
    </div>
  )
}

// ── Vault password prompt (when sessionStorage is empty) ──────────────────────
function VaultPrompt({ onUnlock }: { onUnlock: (pw: string) => void }) {
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUnlock = async () => {
    if (!pw.trim()) return
    setLoading(true)
    setError('')
    try {
      const blob = await fetchVaultBlob(keys.supabaseUrl(), keys.supabaseAnon())
      if (!blob) throw new Error('No vault found in your Supabase')
      await decryptVault(blob, pw) // just to verify password is correct
      sessionStorage.setItem('otto_vault_pw', pw)
      onUnlock(pw)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wrong password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px', borderRadius: 8, background: 'rgba(139,127,245,0.05)', border: '1px solid rgba(139,127,245,0.12)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <LockKey size={14} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 1, opacity: 0.7 }} />
        <p style={{ fontSize: 12, color: 'rgba(176,168,216,0.5)', lineHeight: 1.55, margin: 0 }}>
          Enter your vault password to save changes securely.
        </p>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px', borderRadius: 6,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${focused ? 'rgba(139,127,245,0.35)' : 'rgba(255,255,255,0.07)'}`,
        transition: 'border-color 0.15s',
      }}>
        <input
          type={show ? 'text' : 'password'}
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Your vault passphrase"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'rgba(240,238,255,0.88)', fontSize: 13, fontFamily: 'var(--font-mono)', padding: 0 }}
        />
        <button type="button" onClick={() => setShow(s => !s)} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
          {show ? <EyeSlash size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {error && <p style={{ fontSize: 11.5, color: '#e06b6b', margin: 0 }}>{error}</p>}
      <button
        onClick={handleUnlock}
        disabled={!pw.trim() || loading}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '8px', borderRadius: 6, fontSize: 13, fontWeight: 600,
          background: pw.trim() && !loading ? 'rgba(139,127,245,0.12)' : 'transparent',
          border: `1px solid ${pw.trim() && !loading ? 'rgba(139,127,245,0.28)' : 'rgba(255,255,255,0.07)'}`,
          color: pw.trim() && !loading ? 'var(--color-accent)' : 'rgba(255,255,255,0.2)',
          cursor: pw.trim() && !loading ? 'pointer' : 'default', transition: 'all 0.15s',
        }}
      >
        {loading ? <><CircleNotch size={13} style={{ animation: 'spin 1s linear infinite' }} /> Verifying…</> : 'Unlock to save'}
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function SettingsTab() {
  const [name, setName] = useState(keys.userName())
  const [context, setContext] = useState(keys.userContext())
  const [gemini, setGemini] = useState(keys.gemini())
  const [groq, setGroq] = useState(keys.groq())

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState('')
  const [needsVault, setNeedsVault] = useState(false)

  const isDirty =
    name !== keys.userName() ||
    context !== keys.userContext() ||
    gemini !== keys.gemini() ||
    groq !== keys.groq()

  const doSave = async (vaultPw: string) => {
    setSaveState('running')
    setSaveError('')
    setNeedsVault(false)
    try {
      const newCreds = {
        name: name.trim(),
        context: context.trim(),
        gemini: gemini.trim(),
        groq: groq.trim(),
        supaUrl: keys.supabaseUrl(),
        supaAnon: keys.supabaseAnon(),
      }
      const blob = await encryptVault(newCreds, vaultPw)
      await saveVaultBlob(newCreds.supaUrl, newCreds.supaAnon, blob)
      credsToLocalStorage(newCreds)
      setSaveState('done')
      setTimeout(() => setSaveState('idle'), 2500)
    } catch (e) {
      setSaveState('error')
      setSaveError(e instanceof Error ? e.message : 'Save failed — check your connection')
    }
  }

  const handleSave = async () => {
    const vaultPw = sessionStorage.getItem('otto_vault_pw')
    if (!vaultPw) {
      setNeedsVault(true)
      return
    }
    await doSave(vaultPw)
  }

  const handleSignOut = () => {
    if (!confirm('Sign out of this device? Your notes stay safe in Supabase.')) return
    localStorage.clear()
    sessionStorage.clear()
    location.reload()
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Profile */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Section label="Profile" />
        <Field label="Your name" value={name} onChange={setName} placeholder="e.g. Alex" />
        <Field label="About you" value={context} onChange={setContext} placeholder="Tell Otto about yourself..." multiline />
      </div>

      {/* AI Keys */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Section label="AI Keys" />
        <Field label="Gemini API key" value={gemini} onChange={setGemini} placeholder="AIza..." secret />
        <Field label="Groq API key" value={groq} onChange={setGroq} placeholder="gsk_..." secret />
        <p style={{ fontSize: 11.5, color: 'rgba(176,168,216,0.3)', lineHeight: 1.5, margin: 0 }}>
          Keys are re-encrypted and synced to your Supabase on save.
        </p>
      </div>

      {/* Vault prompt if needed */}
      <AnimatePresence>
        {needsVault && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <VaultPrompt onUnlock={doSave} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save button */}
      {!needsVault && (
        <button
          onClick={handleSave}
          disabled={!isDirty && saveState !== 'error'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '10px', borderRadius: 6, fontSize: 13.5, fontWeight: 600,
            border: `1px solid ${
              saveState === 'done' ? 'rgba(99,232,160,0.28)' :
              saveState === 'error' ? 'rgba(232,99,99,0.22)' :
              isDirty ? 'rgba(139,127,245,0.3)' : 'rgba(255,255,255,0.06)'
            }`,
            background: saveState === 'done' ? 'rgba(99,232,160,0.07)' : saveState === 'error' ? 'rgba(232,99,99,0.06)' : isDirty ? 'rgba(139,127,245,0.08)' : 'transparent',
            color: saveState === 'done' ? '#5ecf8e' : saveState === 'error' ? '#e06b6b' : isDirty ? 'var(--color-accent)' : 'rgba(255,255,255,0.15)',
            cursor: isDirty || saveState === 'error' ? 'pointer' : 'default',
            transition: 'all 0.18s',
          }}
        >
          {saveState === 'running' && <CircleNotch size={14} style={{ animation: 'spin 1s linear infinite' }} />}
          {saveState === 'done' && <CheckCircle size={14} weight="fill" />}
          {saveState === 'idle' && 'Save changes'}
          {saveState === 'running' && 'Saving…'}
          {saveState === 'done' && 'Saved'}
          {saveState === 'error' && 'Retry'}
        </button>
      )}

      <AnimatePresence>
        {saveState === 'error' && saveError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ display: 'flex', gap: 8, padding: '9px 12px', borderRadius: 6, background: 'rgba(232,99,99,0.07)', border: '1px solid rgba(232,99,99,0.15)' }}
          >
            <WarningCircle size={13} style={{ color: '#e06b6b', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: '#e06b6b', lineHeight: 1.5, margin: 0 }}>{saveError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Danger zone */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 'auto', paddingTop: 8 }}>
        <Section label="Device" />
        <button
          onClick={handleSignOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
            background: 'transparent', border: '1px solid rgba(232,99,99,0.14)',
            color: 'rgba(224,107,107,0.6)', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(232,99,99,0.07)'; (e.currentTarget as HTMLElement).style.color = '#e06b6b'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,99,99,0.25)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(224,107,107,0.6)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,99,99,0.14)' }}
        >
          <SignOut size={14} />
          Sign out of this device
        </button>
        <p style={{ fontSize: 11, color: 'rgba(176,168,216,0.25)', lineHeight: 1.5, margin: 0 }}>
          Clears all local keys. Your notes and vault stay safe in Supabase — sign back in anytime with your URL, anon key, and vault password.
        </p>
      </div>

    </div>
  )
}
