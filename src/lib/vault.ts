// Client-side credential encryption using SubtleCrypto (no libraries needed)
// Flow: vault password → PBKDF2 → AES-GCM key → encrypt/decrypt credentials JSON

export interface VaultCredentials {
  gemini: string
  groq: string
  supaUrl: string
  supaAnon: string
  name: string
  context: string
}

interface VaultBlob {
  salt: string  // base64
  iv: string    // base64
  ct: string    // base64 ciphertext
}

const enc = new TextEncoder()
const dec = new TextDecoder()

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0))
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 600000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptVault(creds: VaultCredentials, password: string): Promise<VaultBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(creds))
  )
  return { salt: toBase64(salt), iv: toBase64(iv), ct: toBase64(ct) }
}

export async function decryptVault(blob: VaultBlob, password: string): Promise<VaultCredentials> {
  const salt = fromBase64(blob.salt)
  const iv = fromBase64(blob.iv)
  const ct = fromBase64(blob.ct)
  const key = await deriveKey(password, salt)
  let plain: ArrayBuffer
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, key, ct.buffer as ArrayBuffer)
  } catch {
    throw new Error('Wrong vault password — decryption failed')
  }
  return JSON.parse(dec.decode(plain)) as VaultCredentials
}

export function credsToLocalStorage(creds: VaultCredentials): void {
  localStorage.setItem('otto_name', creds.name)
  localStorage.setItem('otto_context', creds.context)
  localStorage.setItem('otto_gemini_key', creds.gemini)
  localStorage.setItem('otto_groq_key', creds.groq)
  localStorage.setItem('otto_supa_url', creds.supaUrl)
  localStorage.setItem('otto_supa_anon', creds.supaAnon)
}

export function credsFromLocalStorage(): VaultCredentials {
  return {
    name: localStorage.getItem('otto_name') ?? '',
    context: localStorage.getItem('otto_context') ?? '',
    gemini: localStorage.getItem('otto_gemini_key') ?? '',
    groq: localStorage.getItem('otto_groq_key') ?? '',
    supaUrl: localStorage.getItem('otto_supa_url') ?? '',
    supaAnon: localStorage.getItem('otto_supa_anon') ?? '',
  }
}
