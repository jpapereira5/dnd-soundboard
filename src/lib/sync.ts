/**
 * Cloud copy of the session on jsonblob.com, an anonymous JSON store: no
 * account, no token. The blob id is the only secret. It lives in this
 * browser's localStorage and in the page link (#c=<id>), so opening that
 * link on another computer connects it to the same copy. Anyone with the
 * link can read and write. Blobs unused for 30 days are dropped by the
 * service; the app then makes a new one on the next save.
 */
import type { Session } from './types'

const API = 'https://jsonblob.com/api/jsonBlob'
const ID_KEY = 'dnd-soundboard-cloud'

export class SyncError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

/** Id from the page link first (a shared link wins), then from this browser. */
export function getCloudId(): string {
  const fromHash = new URLSearchParams(location.hash.replace(/^#/, '')).get('c')
  if (fromHash && /^[A-Za-z0-9-]{6,}$/.test(fromHash)) {
    setCloudId(fromHash)
    return fromHash
  }
  try {
    return localStorage.getItem(ID_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setCloudId(id: string) {
  try {
    if (id) localStorage.setItem(ID_KEY, id)
    else localStorage.removeItem(ID_KEY)
  } catch {
    /* private mode */
  }
  // Keep the link in sync so a bookmark taken now carries the id.
  const url = new URL(location.href)
  url.hash = id ? `c=${id}` : ''
  history.replaceState(null, '', url)
}

/** The link to open on another computer. */
export function cloudLink(id: string): string {
  const url = new URL(location.href)
  url.hash = `c=${id}`
  return url.toString()
}

async function fail(r: Response): Promise<never> {
  const msg = r.status === 404 ? 'cópia não encontrada (apagada por inatividade?)' : `serviço respondeu ${r.status}`
  throw new SyncError(msg, r.status)
}

const HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' }

/** Creates the blob with this session. Returns its id. */
export async function createRemote(session: Session): Promise<string> {
  const r = await fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify(session) })
  if (!r.ok) await fail(r)
  const id = r.headers.get('X-jsonblob') ?? r.headers.get('Location')?.split('/').pop() ?? ''
  if (!id) throw new SyncError('o serviço não devolveu o id da cópia', r.status)
  return id
}

export async function fetchRemote(id: string): Promise<unknown> {
  const r = await fetch(`${API}/${id}`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  if (!r.ok) await fail(r)
  return r.json()
}

export async function pushRemote(id: string, session: Session): Promise<void> {
  const r = await fetch(`${API}/${id}`, { method: 'PUT', headers: HEADERS, body: JSON.stringify(session) })
  if (!r.ok) await fail(r)
}
