import type { Message } from './types'

const d = (daysAgo: number, h = 10, m = 0) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(h, m, 0, 0)
  return date
}

export const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'two-tier architecture for kitchen monitoring: edge device handles raw sensor aggregation, cloud layer does anomaly detection and alerting. keep the edge dumb, smart stays in cloud.',
    timestamp: d(6, 9, 14),
    tags: [{ label: 'decision' }, { label: 'kitchen monitoring' }],
    noteType: 'decision',
  },
  {
    id: '2',
    role: 'ai-ack',
    content: 'Saved -tagged as decision, kitchen monitoring.',
    timestamp: d(6, 9, 14),
  },
  {
    id: '3',
    role: 'user',
    content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    timestamp: d(6, 11, 30),
    tags: [{ label: 'link' }, { label: 'reference' }],
    noteType: 'link',
    linkTitle: 'The Bitter Lesson -Rich Sutton',
    linkDomain: 'incompleteideas.net',
  },
  {
    id: '4',
    role: 'ai-ack',
    content: "Saved -'The Bitter Lesson' tagged as research, AI fundamentals.",
    timestamp: d(6, 11, 30),
  },
  {
    id: '5',
    role: 'user',
    content: 'what if the weekly digest also flags things i saved but never came back to -unresolved ideas, open questions, stuff i marked important but didnt act on',
    timestamp: d(5, 8, 45),
    tags: [{ label: 'voice' }, { label: 'idea' }],
    noteType: 'voice',
    voiceDuration: '0:34',
  },
  {
    id: '6',
    role: 'ai-ack',
    content: 'Saved -voice note transcribed, tagged as idea, product.',
    timestamp: d(5, 8, 45),
  },
  {
    id: '7',
    role: 'user',
    content: '/ask what have i been thinking about the kitchen monitoring data problem?',
    timestamp: d(3, 14, 20),
    isAsk: true,
  },
  {
    id: '8',
    role: 'ai-response',
    content: "You've been circling a core tension: the edge device needs to stay simple and cheap, but that means the cloud layer has to be smarter than you'd normally want for a latency-sensitive system.\n\nThree weeks ago you noted the two-tier split - edge handles raw sensor aggregation, cloud does anomaly detection. That's the architecture. But last week you saved a note about response time budgets that hints at a problem: if the cloud is doing the detection, you're adding 200-400ms round-trip on every alert trigger. For a kitchen fire scenario, that's not acceptable.\n\nYou haven't resolved this yet. The open thread is: what class of anomalies need sub-100ms response, and can those be handled by a very thin rule-based layer on the edge without making it 'smart'?",
    timestamp: d(3, 14, 20),
    isAsk: true,
  },
  {
    id: '9',
    role: 'user',
    content: 'right - so split the anomaly types. tier-1: immediate physical safety (fire, gas leak) handled on-edge with hard thresholds. tier-2: pattern-based stuff (unusual usage, efficiency drift) goes to cloud.',
    timestamp: d(3, 14, 32),
    tags: [{ label: 'decision' }, { label: 'kitchen monitoring' }, { label: 'architecture' }],
    noteType: 'decision',
  },
  {
    id: '10',
    role: 'ai-ack',
    content: 'Saved -tagged as decision, kitchen monitoring, architecture.',
    timestamp: d(3, 14, 32),
  },
  {
    id: '11',
    role: 'user',
    content: 'idea: use the second brain app itself to log all project decisions as they happen. becomes a searchable decision log automatically.',
    timestamp: d(1, 16, 5),
    tags: [{ label: 'idea' }, { label: 'meta' }],
    noteType: 'idea',
  },
  {
    id: '12',
    role: 'ai-ack',
    content: 'Saved -tagged as idea, meta. This links to your note from 3 weeks ago about using the app as a personal ops tool.',
    timestamp: d(1, 16, 5),
  },
  {
    id: '13',
    role: 'user',
    content: 'context window management when corpus hits 1M tokens -when does that actually become a problem at 10 notes/day?',
    timestamp: d(0, 9, 10),
    tags: [{ label: 'idea' }, { label: 'second brain' }],
    noteType: 'idea',
  },
  {
    id: '14',
    role: 'ai-ack',
    content: 'Saved -tagged as idea, second brain.',
    timestamp: d(0, 9, 10),
  },
]

export const MOCK_AI_ACKS: string[] = [
  'Saved -tagged as {type}.',
  'Saved -tagged as {type}, noted.',
  'Got it -saved as {type}.',
  'Saved.',
]

export const MOCK_ASK_RESPONSES: string[] = [
  "Based on everything you've saved, there are a few threads worth pulling on here. The most recent notes suggest you're converging on a solution, but there are two open questions you haven't explicitly answered yet.\n\nWant me to surface those specifically?",
  "You've touched this topic from three different angles over the past two weeks. The clearest signal is in the decision you logged on Tuesday -that one seems to be load-bearing for everything downstream.\n\nThe tension I see: your latest note assumes X, but an earlier one says Y. Those two things don't fully reconcile.",
  "Short answer: you've already thought this through more than you remember. The note from last Thursday has the core insight. The newer notes are mostly elaborations.\n\nDo you want me to pull the exact wording, or give you my synthesis?",
]
