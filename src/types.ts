export type NoteType = 'idea' | 'link' | 'code' | 'decision' | 'voice' | 'image' | 'file'

export type MessageRole = 'user' | 'ai-ack' | 'ai-response'

export interface Tag {
  label: string
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  tags?: Tag[]
  isAsk?: boolean
  noteType?: NoteType
  voiceDuration?: string
  imageUrl?: string
  linkTitle?: string
  linkDomain?: string
}

export type SidebarTab = 'links' | 'media' | 'dashboard' | 'browse' | 'settings'

export interface LinkItem {
  id: string
  title: string
  domain: string
  url: string
  summary: string
  tag: string
  time: string
  favicon?: string
}

export interface VoiceItem {
  id: string
  duration: string
  transcript: string
  time: string
}

export interface ImageItem {
  id: string
  url: string
  label: string
  time: string
}

export interface NoteItem {
  id: string
  content: string
  noteType: NoteType
  time: string
  tags: string[]
}
