/**
 * The session travels inside the page link: `#s=<compressed json>`. The
 * address bar is kept up to date after every change, so the link is always
 * the latest copy, with no service and no account behind it. Opening the
 * link on another computer loads that copy (when newer than what is there);
 * Chrome's synced tabs and history carry it across devices as well.
 */
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { Session } from './types'

const PARAM = 's'

export function encodeSession(session: Session): string {
  return compressToEncodedURIComponent(JSON.stringify(session))
}

/** Session carried by the current link, or null when there is none or it is unreadable. */
export function sessionFromLink(): unknown {
  const raw = new URLSearchParams(location.hash.replace(/^#/, '')).get(PARAM)
  if (!raw) return null
  try {
    const json = decompressFromEncodedURIComponent(raw)
    return json ? JSON.parse(json) : null
  } catch {
    return null
  }
}

/** Rewrites the address bar so it always holds the session as it is now. */
export function writeLink(session: Session) {
  const url = new URL(location.href)
  url.hash = `${PARAM}=${encodeSession(session)}`
  if (url.href !== location.href) history.replaceState(null, '', url)
}

export function currentLink(): string {
  return location.href
}
