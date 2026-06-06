import type { LinkItem, VoiceItem, ImageItem, NoteItem } from './types'


export const MOCK_LINKS: LinkItem[] = [
  {
    id: '1',
    title: 'The Bitter Lesson',
    domain: 'incompleteideas.net',
    url: 'http://www.incompleteideas.net/IncIdeas/BitterLesson.html',
    summary: 'Rich Sutton argues general methods that leverage computation beat hand-coded domain knowledge.',
    tag: 'research',
    time: '3d ago',
  },
  {
    id: '2',
    title: 'Edge AI inference benchmarks 2025',
    domain: 'arxiv.org',
    url: 'https://arxiv.org',
    summary: 'Comparative latency and power draw across Coral, RPi 5, and Jetson Orin for real-time CV tasks.',
    tag: 'research',
    time: '5d ago',
  },
  {
    id: '3',
    title: 'Supabase Storage — direct browser uploads',
    domain: 'supabase.com',
    url: 'https://supabase.com/docs/storage',
    summary: 'How to upload files directly from the browser to Supabase Storage without a backend proxy.',
    tag: 'tools',
    time: '1w ago',
  },
  {
    id: '4',
    title: 'Gemini context window pricing breakdown',
    domain: 'ai.google.dev',
    url: 'https://ai.google.dev',
    summary: 'Token cost breakdown for 1M context window calls — free tier limits and burst behavior.',
    tag: 'reference',
    time: '1w ago',
  },
  {
    id: '5',
    title: 'PWA Share Target API — MDN',
    domain: 'developer.mozilla.org',
    url: 'https://developer.mozilla.org',
    summary: 'How to register a PWA as a share target on Android so it shows up in the system share sheet.',
    tag: 'tools',
    time: '2w ago',
  },
  {
    id: '6',
    title: 'Web Speech API — browser transcription',
    domain: 'developer.mozilla.org',
    url: 'https://developer.mozilla.org',
    summary: 'On-device speech recognition with no server required. Fallback for when Groq is unavailable.',
    tag: 'tools',
    time: '2w ago',
  },
]

export const MOCK_VOICE_NOTES: VoiceItem[] = [
  {
    id: '1',
    duration: '0:34',
    transcript: 'what if the weekly digest also flags things I saved but never came back to - unresolved ideas, open questions that I started and dropped. could be a separate section on the dashboard.',
    time: '2d ago',
  },
  {
    id: '2',
    duration: '1:12',
    transcript: 'thinking about the edge tier - should it really be stateless or do we need a small local buffer for burst writes. if the connection drops mid-capture session we lose data. maybe a service worker queue.',
    time: '4d ago',
  },
  {
    id: '3',
    duration: '0:22',
    transcript: 'reminder to look at Web Share Target API spec again, the intent matching part is confusing. need to test whether audio files from voice memos app come through correctly.',
    time: '1w ago',
  },
]

export const MOCK_IMAGES: ImageItem[] = [
  { id: '1', url: 'https://picsum.photos/seed/kitchen-sensor-layout/400/320', label: 'sensor board layout', time: '3d ago' },
  { id: '2', url: 'https://picsum.photos/seed/react-debug-screen/400/320', label: 'react error screenshot', time: '5d ago' },
  { id: '3', url: 'https://picsum.photos/seed/architecture-whiteboard/400/320', label: 'architecture diagram', time: '1w ago' },
  { id: '4', url: 'https://picsum.photos/seed/meeting-whiteboard/400/320', label: 'whiteboard photo', time: '2w ago' },
]

export const MOCK_NOTES: NoteItem[] = [
  {
    id: '1',
    content: 'context window management when corpus hits 1M tokens - when does that actually become a problem at 10 notes/day?',
    noteType: 'idea',
    time: 'Today 9:10 AM',
    tags: ['idea', 'second brain'],
  },
  {
    id: '2',
    content: 'right - so split the anomaly types. tier-1: immediate physical safety (fire, gas leak) handled on-edge with hard thresholds. tier-2: pattern-based stuff (unusual usage, efficiency drift) goes to cloud.',
    noteType: 'decision',
    time: 'Yesterday 2:32 PM',
    tags: ['decision', 'kitchen monitoring', 'architecture'],
  },
  {
    id: '3',
    content: 'idea: use the second brain app itself to log all project decisions as they happen. becomes a searchable decision log automatically.',
    noteType: 'idea',
    time: 'Yesterday 4:05 PM',
    tags: ['idea', 'meta'],
  },
  {
    id: '4',
    content: 'groq whisper large v3 turbo supports urdu/english code-switching natively. tested with mixed sentences - accuracy is solid.',
    noteType: 'idea',
    time: 'Tuesday 11:30 AM',
    tags: ['idea', 'second brain'],
  },
  {
    id: '5',
    content: 'const useSpring = (target, config) => { ... } — motion spring hook pattern for scroll interpolation',
    noteType: 'code',
    time: 'Monday 3:15 PM',
    tags: ['code'],
  },
  {
    id: '6',
    content: 'decided: no RAG. full corpus in context on every /ask. at personal capture rates this fits in gemini 1M window for 2+ years.',
    noteType: 'decision',
    time: 'Last Friday 10:00 AM',
    tags: ['decision', 'architecture'],
  },
  {
    id: '7',
    content: 'https://web.dev/share-target/ - read the full spec, especially the POST method for binary files',
    noteType: 'link',
    time: '2w ago',
    tags: ['link', 'tools'],
  },
]

export const MOCK_UNRESOLVED = [
  { note: 'context window management when corpus hits 1M tokens', age: '3h ago' },
  { note: 'what if weekly digest flags things never revisited', age: '2d ago' },
  { note: 'browser extension for desktop link capture', age: '1w ago' },
]

export const MOCK_CONNECTIONS = [
  {
    a: 'Your note on edge-tier stateless design (4d ago)',
    b: 'links to the service worker queue idea from your voice note yesterday',
  },
]
