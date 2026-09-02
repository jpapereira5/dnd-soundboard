import { untrack } from 'svelte'
import type { Kind, PlayerStatus, Scene, Session, Sfx, Track } from './types'
import { FADE_MS, uid } from './types'
import { TrackPlayer } from './youtube'

const STORAGE_KEY = 'dnd-soundboard-v1'

function defaultSession(): Session {
  return {
    version: 1,
    scenes: [{ id: uid(), name: 'Taberna', tracks: [] }],
    sfx: [],
    master: 80,
  }
}

function load(): Session {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return normalize(JSON.parse(raw))
  } catch {
    /* fall through to defaults */
  }
  return defaultSession()
}

/** Fills in missing fields so older or hand-edited files still load. */
function normalize(data: unknown): Session {
  const d = (data ?? {}) as Partial<Session>
  const scenes = Array.isArray(d.scenes) ? d.scenes : []
  const sfx = Array.isArray(d.sfx) ? d.sfx : []
  return {
    version: 1,
    scenes: scenes.map((s) => ({
      id: s.id ?? uid(),
      name: s.name ?? 'Cena',
      tracks: (Array.isArray(s.tracks) ? s.tracks : []).map((t) => ({
        id: t.id ?? uid(),
        ytId: t.ytId,
        kind: t.kind === 'playlist' ? 'playlist' : 'video',
        title: t.title ?? '',
        volume: clamp(t.volume ?? 70),
        shuffle: t.shuffle ?? false,
      })),
    })),
    sfx: sfx.map((s) => ({
      id: s.id ?? uid(),
      ytId: s.ytId,
      title: s.title ?? '',
      volume: clamp(s.volume ?? 100),
    })),
    master: clamp(d.master ?? 80),
  }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Number(v) || 0))
}

/**
 * Maps a 0..100 slider to a 0..1 gain. Squared so the low end of the
 * slider gets much finer control: 50 gives a quarter of the loudness of
 * 100, and the first few steps above 0 are barely audible.
 */
export function sliderToGain(v: number): number {
  const x = clamp(v) / 100
  return x * x
}

// ---------------------------------------------------------------------------
// Reactive state
// ---------------------------------------------------------------------------

export const session = $state<Session>(load())

export const runtime = $state({
  /** Scene shown in the UI. */
  viewSceneId: session.scenes[0]?.id ?? null,
  /** Scene that was last activated (crossfaded in). */
  activeSceneId: null as string | null,
  /** Scenes whose players have been created. */
  armed: session.scenes[0] ? [session.scenes[0].id] : ([] as string[]),
  status: {} as Record<string, PlayerStatus>,
  errors: {} as Record<string, string>,
  titles: {} as Record<string, string>,
  showHelp: false,
})

// Persist on every change. $effect.root lets us do this outside a component.
$effect.root(() => {
  $effect(() => {
    const json = JSON.stringify(session)
    localStorage.setItem(STORAGE_KEY, json)
  })
})

// ---------------------------------------------------------------------------
// Player registry (plain Map, not reactive on purpose)
// ---------------------------------------------------------------------------

const players = new Map<string, TrackPlayer>()

/** Tracks asked to play before their player existed: id -> fade ms. */
const pendingPlays = new Map<string, number>()

export interface RegisterOptions {
  ytId: string
  kind: Kind
  loop: boolean
  shuffle: boolean
  volume: number
}

export function registerPlayer(id: string, host: HTMLElement, opts: RegisterOptions) {
  // Read before unregisterPlayer, which clears the pending entry.
  const pendingFade = pendingPlays.get(id)
  unregisterPlayer(id)
  const player = new TrackPlayer(host, {
    ytId: opts.ytId,
    kind: opts.kind,
    loop: opts.loop,
    shuffle: opts.shuffle,
    gain: sliderToGain(opts.volume),
    master: untrack(() => session.master) / 100,
    onStatus: (status, detail) => {
      runtime.status[id] = status
      if (status === 'error') runtime.errors[id] = detail ?? 'erro'
      else delete runtime.errors[id]
    },
    onTitle: (title) => {
      runtime.titles[id] = title
      const track = findTrack(id)
      if (track && !track.title) track.title = title
      const sfx = session.sfx.find((s) => s.id === id)
      if (sfx && !sfx.title) sfx.title = title
    },
  })
  players.set(id, player)
  if (pendingFade !== undefined) player.play(pendingFade)
}

export function unregisterPlayer(id: string) {
  players.get(id)?.destroy()
  players.delete(id)
  pendingPlays.delete(id)
  delete runtime.status[id]
  delete runtime.titles[id]
  delete runtime.errors[id]
}

export function getPlayer(id: string): TrackPlayer | undefined {
  return players.get(id)
}

function findTrack(id: string): Track | undefined {
  return findSceneOfTrack(id)?.tracks.find((t) => t.id === id)
}

function findSceneOfTrack(id: string): Scene | undefined {
  return session.scenes.find((s) => s.tracks.some((t) => t.id === id))
}

/** Scene tracks fade over FADE_MS; SFX are cut instantly. */
function fadeFor(id: string): number {
  return findSceneOfTrack(id) ? FADE_MS : 0
}

// ---------------------------------------------------------------------------
// Playback control
// ---------------------------------------------------------------------------

export function isPlaying(id: string): boolean {
  const s = runtime.status[id]
  return s === 'playing' || s === 'fading'
}

export function armScene(sceneId: string) {
  if (!runtime.armed.includes(sceneId)) runtime.armed.push(sceneId)
}

export function viewScene(sceneId: string) {
  runtime.viewSceneId = sceneId
  armScene(sceneId)
}

/**
 * Fade the scene in. Whatever else is playing fades out, so switching scenes
 * is a crossfade. Tracks that were not already playing start over (see
 * TrackPlayer.play); ones already playing are left alone.
 */
export function activateScene(sceneId: string) {
  const scene = session.scenes.find((s) => s.id === sceneId)
  if (!scene) return
  armScene(sceneId)
  runtime.activeSceneId = sceneId
  runtime.viewSceneId = sceneId
  const wanted = new Set(scene.tracks.map((t) => t.id))
  for (const [id, player] of players) {
    if (wanted.has(id)) continue
    if (player.active && !session.sfx.some((s) => s.id === id)) player.stop(fadeFor(id))
  }
  pendingPlays.clear()
  for (const track of scene.tracks) {
    const player = players.get(track.id)
    if (!player) pendingPlays.set(track.id, FADE_MS)
    else if (!player.active) player.play(FADE_MS)
  }
}

/** Fade only this scene's tracks out. */
export function fadeOutScene(sceneId: string) {
  const scene = session.scenes.find((s) => s.id === sceneId)
  if (!scene) return
  if (runtime.activeSceneId === sceneId) runtime.activeSceneId = null
  for (const track of scene.tracks) {
    pendingPlays.delete(track.id)
    players.get(track.id)?.stop(FADE_MS)
  }
}

/** Fade every ambient track out. SFX are cut immediately. */
export function stopAll(immediate = false) {
  runtime.activeSceneId = null
  pendingPlays.clear()
  for (const [id, player] of players) player.stop(immediate ? 0 : fadeFor(id))
}

/** Play button on a track card. Starting always restarts, same as a scene start. */
export function toggleTrack(track: Track) {
  const player = players.get(track.id)
  if (!player) return
  const fade = fadeFor(track.id)
  if (player.active) player.stop(fade)
  else player.play(fade)
}

export function nextInPlaylist(track: Track) {
  players.get(track.id)?.nextInPlaylist()
}

export function applyTrackSettings(track: Track) {
  const player = players.get(track.id)
  if (!player) return
  player.setGain(sliderToGain(track.volume))
  player.setShuffle(track.shuffle)
}

export function applySfxVolume(sfx: Sfx) {
  players.get(sfx.id)?.setGain(sliderToGain(sfx.volume))
}

export function setMaster(value: number) {
  session.master = clamp(value)
  for (const player of players.values()) player.setMaster(session.master / 100)
}

export function playSfx(sfx: Sfx) {
  players.get(sfx.id)?.playOnce()
}

// ---------------------------------------------------------------------------
// Session editing
// ---------------------------------------------------------------------------

export function addScene(name = 'Nova cena'): Scene {
  const scene: Scene = { id: uid(), name, tracks: [] }
  session.scenes.push(scene)
  viewScene(scene.id)
  // Return the reactive proxy, not the plain object we pushed.
  return session.scenes[session.scenes.length - 1]
}

export function removeScene(sceneId: string) {
  const index = session.scenes.findIndex((s) => s.id === sceneId)
  if (index < 0) return
  for (const track of session.scenes[index].tracks) unregisterPlayer(track.id)
  session.scenes.splice(index, 1)
  runtime.armed = runtime.armed.filter((id) => id !== sceneId)
  if (runtime.activeSceneId === sceneId) runtime.activeSceneId = null
  if (runtime.viewSceneId === sceneId) {
    const next = session.scenes[Math.max(0, index - 1)]
    runtime.viewSceneId = next?.id ?? null
    if (next) armScene(next.id)
  }
}

/** Moves a scene so it ends up at `target` in the list (clamped). Used by tab drag and drop. */
export function moveSceneTo(sceneId: string, target: number) {
  const index = session.scenes.findIndex((s) => s.id === sceneId)
  if (index < 0) return
  target = Math.max(0, Math.min(session.scenes.length - 1, target))
  if (target === index) return
  const [scene] = session.scenes.splice(index, 1)
  session.scenes.splice(target, 0, scene)
}

export function addTrack(sceneId: string, ytId: string, kind: Kind, title = ''): Track | null {
  const scene = session.scenes.find((s) => s.id === sceneId)
  if (!scene) return null
  const track: Track = {
    id: uid(),
    ytId,
    kind,
    title,
    volume: 70,
    shuffle: false,
  }
  scene.tracks.push(track)
  return track
}

export function removeTrack(sceneId: string, trackId: string) {
  const scene = session.scenes.find((s) => s.id === sceneId)
  if (!scene) return
  unregisterPlayer(trackId)
  scene.tracks = scene.tracks.filter((t) => t.id !== trackId)
}

export function addSfx(ytId: string, title = ''): Sfx {
  const sfx: Sfx = { id: uid(), ytId, title, volume: 100 }
  session.sfx.push(sfx)
  return sfx
}

export function removeSfx(sfxId: string) {
  unregisterPlayer(sfxId)
  session.sfx = session.sfx.filter((s) => s.id !== sfxId)
}

// ---------------------------------------------------------------------------
// Import / export
// ---------------------------------------------------------------------------

export function exportSession() {
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dnd-soundboard-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importSession(file: File) {
  const data = normalize(JSON.parse(await file.text()))
  stopAll(true)
  for (const id of [...players.keys()]) unregisterPlayer(id)
  session.scenes = data.scenes
  session.sfx = data.sfx
  session.master = data.master
  runtime.armed = []
  runtime.activeSceneId = null
  runtime.viewSceneId = session.scenes[0]?.id ?? null
  if (runtime.viewSceneId) armScene(runtime.viewSceneId)
}
