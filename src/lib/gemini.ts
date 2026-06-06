import { GoogleGenAI } from '@google/genai'
import { keys } from './keys'
import { buildSystemPrompt, buildDumpPrompt } from './prompt'
import type { Note } from './supabase'

const MODEL = 'gemini-3-flash-preview'

function ai() {
  return new GoogleGenAI({ apiKey: keys.gemini() })
}

// ── Action types Otto can embed in responses ───────────────────────────────────

export interface OttoAction {
  action: 'update_note' | 'save_note'
  note_id?: string
  content?: string
  tags?: string[]
}

// Parse optional JSON action block from Otto's response
// Otto may append: <<<ACTION{"action":"update_note","note_id":"...","content":"...","tags":[...]}>>>
export function parseOttoAction(raw: string): { text: string; ottoAction: OttoAction | null } {
  const match = raw.match(/<<<ACTION(\{.*?\})>>>/s)
  if (!match) return { text: raw, ottoAction: null }
  try {
    const ottoAction = JSON.parse(match[1]) as OttoAction
    const text = raw.replace(match[0], '').trim()
    return { text, ottoAction }
  } catch {
    return { text: raw.replace(/<<<ACTION.*?>>>/s, '').trim(), ottoAction: null }
  }
}

// ── Dump mode — save + ack + tags in one call ──────────────────────────────────

export async function dumpAck(
  content: string,
  type: string
): Promise<{ ack: string; tags: string[] }> {
  const prompt = buildDumpPrompt(content)

  const response = await ai().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      temperature: 0.4,
      maxOutputTokens: 120,
    },
  })

  const text = response.text?.trim() ?? ''

  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return { ack: 'Saved.', tags: [type] }
  }
}

// ── Ask mode streaming ─────────────────────────────────────────────────────────

export async function askOttoStream(
  history: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string,
  notes: Note[],
  weeklyDigest: string,
  onChunk: (chunk: string) => void
): Promise<{ fullText: string; ottoAction: OttoAction | null }> {
  const systemPrompt = buildSystemPrompt(notes, weeklyDigest)

  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: "Understood. I'm Otto — I have full context. Ready." }] },
    ...history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ]

  const stream = await ai().models.generateContentStream({
    model: MODEL,
    contents,
    config: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  })

  let raw = ''
  for await (const chunk of stream) {
    const text = chunk.text ?? ''
    raw += text
    // Strip action block prefix during streaming so it never appears in UI
    // If action block hasn't started yet, stream as-is
    const actionStart = raw.indexOf('<<<ACTION')
    const visible = actionStart === -1 ? raw : raw.slice(0, actionStart)
    onChunk(visible)
  }

  // Final parse after full response
  const { text: fullText, ottoAction } = parseOttoAction(raw)
  return { fullText, ottoAction }
}

// ── Weekly digest generation ───────────────────────────────────────────────────

export async function generateWeeklyDigest(notes: Note[]): Promise<string> {
  const name = keys.userName()
  const recent = notes
    .filter(n => {
      const age = Date.now() - new Date(n.created_at).getTime()
      return age < 7 * 24 * 60 * 60 * 1000
    })
    .map(n => `[${n.type}] ${n.transcript || n.content || n.link_title || n.file_name}`)
    .join('\n')

  if (!recent) return ''

  const prompt = `Based on these notes ${name} saved in the last 7 days, write a short 2-3 sentence paragraph (no lists, no headers) capturing what they've been actively thinking about, working on, and focused on. Be specific and grounded in the actual content. Write in third person about their focus areas.

Notes:
${recent}`

  const response = await ai().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { temperature: 0.5, maxOutputTokens: 200 },
  })

  return response.text?.trim() ?? ''
}
