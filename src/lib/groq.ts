import { keys } from './keys'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const MODEL = 'whisper-large-v3-turbo'

// Whisper prompt hint for Roman Urdu + English code-switching
const WHISPER_PROMPT =
  'The speaker may mix English and Urdu. Roman Urdu is expected and common. ' +
  'Common Roman Urdu words: yaar, matlab, theek, nahi, acha, bas, abhi, phir, ' +
  'kyun, kya, toh, bhi, sab, karo, hai, tha, hoga, chahiye, bilkul, zyada, kam.'

export async function transcribeAudio(audioBlob: Blob, mimeType: string): Promise<string> {
  const apiKey = keys.groq()
  if (!apiKey) throw new Error('Groq API key not set')

  // Determine file extension from mime type
  const ext = mimeType.includes('webm') ? 'webm'
    : mimeType.includes('wav') ? 'wav'
    : mimeType.includes('mp4') ? 'mp4'
    : mimeType.includes('ogg') ? 'ogg'
    : 'webm'

  const formData = new FormData()
  formData.append('file', audioBlob, `recording.${ext}`)
  formData.append('model', MODEL)
  formData.append('prompt', WHISPER_PROMPT)
  formData.append('response_format', 'json')
  formData.append('temperature', '0')
  // No language lock — let Whisper auto-detect (handles Urdu/English/mixed)

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq transcription failed (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.text?.trim() ?? ''
}
