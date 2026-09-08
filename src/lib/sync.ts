/**
 * Cloud copy of the session, stored as session.json on the `data` branch of
 * the GitHub repository. The repo is public, so reading needs no token;
 * writing needs a fine-grained token with Contents: read and write on this
 * one repository, kept in localStorage on each computer.
 */
import type { Session } from './types'

const OWNER = 'jpapereira5'
const REPO = 'dnd-soundboard'
const BRANCH = 'data'
const FILE = 'session.json'
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`
const TOKEN_KEY = 'dnd-soundboard-token'

export const SYNC_HELP_URL = 'https://github.com/settings/personal-access-tokens/new'

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private mode: nothing to do */
  }
}

export interface Remote {
  /** Parsed file, or null when the file is empty. */
  data: unknown
  /** Blob sha, needed to overwrite the file. */
  sha: string
}

export class SyncError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

function headers(token: string): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/vnd.github+json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

async function fail(r: Response): Promise<never> {
  const text = await r.text().catch(() => '')
  const msg =
    r.status === 401
      ? 'token inválido'
      : r.status === 403
        ? 'sem permissão (o token precisa de Contents: read and write)'
        : r.status === 404
          ? 'ficheiro não encontrado'
          : r.status === 409 || r.status === 422
            ? 'conflito'
            : `GitHub ${r.status}`
  throw new SyncError(msg + (text && r.status >= 500 ? `: ${text.slice(0, 80)}` : ''), r.status)
}

export async function fetchRemote(token = getToken()): Promise<Remote> {
  const r = await fetch(`${API}?ref=${BRANCH}&t=${Date.now()}`, { headers: headers(token), cache: 'no-store' })
  if (!r.ok) await fail(r)
  const j = (await r.json()) as { content: string; sha: string }
  const text = decodeBase64(j.content).trim()
  return { data: text ? JSON.parse(text) : null, sha: j.sha }
}

/** Overwrites the remote file. `sha` must be the current blob sha, or the API answers 409/422. Returns the new sha. */
export async function pushRemote(session: Session, sha: string | null, token = getToken()): Promise<string> {
  if (!token) throw new SyncError('sem token', 0)
  const body = {
    message: `Sessão ${new Date().toISOString()}`,
    content: encodeBase64(JSON.stringify(session, null, 2) + '\n'),
    branch: BRANCH,
    ...(sha ? { sha } : {}),
  }
  const r = await fetch(API, { method: 'PUT', headers: { ...headers(token), 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) await fail(r)
  const j = (await r.json()) as { content: { sha: string } }
  return j.content.sha
}

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function decodeBase64(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
