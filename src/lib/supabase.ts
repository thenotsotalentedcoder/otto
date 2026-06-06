import { createClient } from '@supabase/supabase-js'
import { keys } from './keys'
import type { NoteType } from '../types'

// Client is created fresh each call so it always picks up latest keys from localStorage
function client() {
  return createClient(keys.supabaseUrl(), keys.supabaseAnon())
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Note {
  id: string
  content: string
  type: NoteType
  source: 'typed' | 'voice' | 'share_sheet' | 'image_upload' | 'file_upload'
  link_url?: string
  link_title?: string
  link_summary?: string
  file_path?: string
  file_name?: string
  file_mime?: string
  transcript?: string
  ai_tags: string[]
  created_at: string
}

export interface DbMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  is_ask_mode: boolean
  saved: boolean
  note_id?: string
  created_at: string
}

export interface WeeklyDigest {
  id: string
  content: string
  generated_at: string
}

// ── Notes ──────────────────────────────────────────────────────────────────────

export async function insertNote(note: Omit<Note, 'id' | 'created_at'>): Promise<Note> {
  const { data, error } = await client()
    .from('notes')
    .insert(note)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchAllNotes(): Promise<Note[]> {
  const { data, error } = await client()
    .from('notes')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchNotesByType(type: NoteType): Promise<Note[]> {
  const { data, error } = await client()
    .from('notes')
    .select('*')
    .eq('type', type)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateNoteTags(id: string, ai_tags: string[]): Promise<void> {
  const { error } = await client()
    .from('notes')
    .update({ ai_tags })
    .eq('id', id)
  if (error) throw error
}

export async function updateNote(id: string, patch: Partial<Pick<Note, 'content' | 'ai_tags' | 'type'>>): Promise<Note> {
  const { data, error } = await client()
    .from('notes')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Messages ───────────────────────────────────────────────────────────────────

export async function insertMessage(msg: Omit<DbMessage, 'id' | 'created_at'>): Promise<DbMessage> {
  const { data, error } = await client()
    .from('messages')
    .insert(msg)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchMessages(): Promise<DbMessage[]> {
  const { data, error } = await client()
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function toggleMessageSaved(id: string, saved: boolean): Promise<void> {
  const { error } = await client()
    .from('messages')
    .update({ saved })
    .eq('id', id)
  if (error) throw error
}

// ── Weekly digest ──────────────────────────────────────────────────────────────

export async function fetchWeeklyDigest(): Promise<WeeklyDigest | null> {
  const { data, error } = await client()
    .from('weekly_digest')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertWeeklyDigest(content: string): Promise<void> {
  // Always single row — delete old, insert new
  await client().from('weekly_digest').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const { error } = await client().from('weekly_digest').insert({ content })
  if (error) throw error
}

// ── User settings / vault ─────────────────────────────────────────────────────

export interface VaultRow {
  salt: string
  iv: string
  ct: string
}

export async function saveVaultBlob(url: string, anonKey: string, blob: VaultRow): Promise<void> {
  const c = createClient(url, anonKey)
  const { error } = await c.from('user_settings').upsert({ id: 1, ...blob })
  if (error) throw error
}

export async function fetchVaultBlob(url: string, anonKey: string): Promise<VaultRow | null> {
  const c = createClient(url, anonKey)
  const { data, error } = await c.from('user_settings').select('salt,iv,ct').eq('id', 1).maybeSingle()
  if (error) throw error
  return data as VaultRow | null
}

// ── Storage ────────────────────────────────────────────────────────────────────

export async function uploadFile(
  bucket: 'voice-notes' | 'images' | 'files',
  path: string,
  file: File | Blob,
  contentType: string
): Promise<string> {
  const { error } = await client().storage.from(bucket).upload(path, file, {
    contentType,
    upsert: false,
  })
  if (error) throw error

  if (bucket === 'images') {
    const { data } = client().storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  // Private buckets — return the storage path, fetch signed URL on demand
  return path
}

export async function getSignedUrl(
  bucket: 'voice-notes' | 'files',
  path: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await client().storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}

export async function downloadFile(
  bucket: 'voice-notes' | 'files',
  path: string
): Promise<Blob> {
  const { data, error } = await client().storage.from(bucket).download(path)
  if (error) throw error
  return data
}
