export interface LinkMeta {
  title: string
  description: string
  domain: string
}

export async function scrapeLink(url: string): Promise<LinkMeta> {
  const domain = new URL(url).hostname.replace(/^www\./, '')

  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    const res = await fetch(proxy, { signal: AbortSignal.timeout(8000) })
    const json = await res.json()
    const html: string = json.contents ?? ''

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)

    const title = (ogTitle?.[1] || titleMatch?.[1] || domain).trim().slice(0, 120)
    const description = (ogDesc?.[1] || metaDesc?.[1] || '').trim().slice(0, 300)

    return { title, description, domain }
  } catch {
    return { title: domain, description: '', domain }
  }
}
