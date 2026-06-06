/**
 * Key resolution — reads from localStorage (onboarding) with .env fallback (dev).
 * Swap Phase 1→2 happens here only, nowhere else in the codebase.
 */

export const keys = {
  supabaseUrl:  () => localStorage.getItem('otto_supa_url')     || '',
  supabaseAnon: () => localStorage.getItem('otto_supa_anon')    || '',
  gemini:       () => localStorage.getItem('otto_gemini_key')   || '',
  groq:         () => localStorage.getItem('otto_groq_key')     || '',
  userName:     () => localStorage.getItem('otto_name')         || 'there',
  userContext:  () => localStorage.getItem('otto_context')      || '',
}
