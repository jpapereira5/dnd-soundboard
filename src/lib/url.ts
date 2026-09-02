export interface ParsedYouTube {
  videoId?: string
  playlistId?: string
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const PLAYLIST_ID = /^[A-Za-z0-9_-]{13,}$/

/** Accepts full URLs, youtu.be links, shorts, embeds, playlist links or bare IDs. */
export function parseYouTube(input: string): ParsedYouTube | null {
  const text = input.trim()
  if (!text) return null

  if (VIDEO_ID.test(text)) return { videoId: text }
  if (/^(PL|UU|OLAK5uy_|FL|RD)/.test(text) && PLAYLIST_ID.test(text)) return { playlistId: text }

  let url: URL
  try {
    url = new URL(text.includes('://') ? text : `https://${text}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\.|^m\.|^music\./, '')
  if (host !== 'youtube.com' && host !== 'youtu.be' && host !== 'youtube-nocookie.com') return null

  const out: ParsedYouTube = {}
  const list = url.searchParams.get('list')
  if (list && PLAYLIST_ID.test(list)) out.playlistId = list

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0]
    if (VIDEO_ID.test(id)) out.videoId = id
  } else {
    const v = url.searchParams.get('v')
    if (v && VIDEO_ID.test(v)) out.videoId = v
    const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/)
    if (m) out.videoId = m[1]
  }

  return out.videoId || out.playlistId ? out : null
}
