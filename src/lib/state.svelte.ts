import { untrack } from 'svelte'
import type { Group, Kind, PlayerStatus, Scene, Session, Sfx, Track } from './types'
import { FADE_MS, GROUPS, uid } from './types'
import { TrackPlayer } from './youtube'

const STORAGE_KEY = 'dnd-soundboard-v1'

function defaultSession(): Session {
  return {
    version: 2,
    scenes: [{ id: uid(), name: 'Taberna', tracks: [], sfx: [] }],
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

const GROUP_IDS = new Set<string>(GROUPS.map((g) => g.id))

/**
 * Fills in missing fields so older or hand-edited files still load.
 * Version 1 files had one global SFX list and untyped tracks: those tracks
 * become music, and the effects move into the first scene.
 */
function normalize(data: unknown): Session {
  const d = (data ?? {}) as Partial<Session> & { sfx?: Partial<Sfx>[] }
  const rawScenes = Array.isArray(d.scenes) ? d.scenes : []
  const normSfx = (list: unknown): Sfx[] =>
    (Array.isArray(list) ? (list as Partial<Sfx>[]) : [])
      .filter((s) => typeof s.ytId === 'string')
      .map((s) => ({
        id: s.id ?? uid(),
        ytId: s.ytId!,
        title: s.title ?? '',
        volume: clamp(s.volume ?? 100),
      }))
  const scenes: Scene[] = rawScenes.map((s) => ({
    id: s.id ?? uid(),
    name: s.name ?? 'Cena',
    tracks: (Array.isArray(s.tracks) ? s.tracks : [])
      .filter((t) => typeof t.ytId === 'string')
      .map((t) => ({
        id: t.id ?? uid(),
        ytId: t.ytId!,
        kind: t.kind === 'playlist' ? 'playlist' : 'video',
        title: t.title ?? '',
        volume: clamp(t.volume ?? 70),
        shuffle: t.shuffle ?? false,
        group: t.group && GROUP_IDS.has(t.group) ? t.group : 'music',
      })),
    sfx: normSfx(s.sfx),
  }))
  const legacySfx = normSfx(d.sfx)
  if (legacySfx.length) {
    if (!scenes.length) scenes.push({ id: uid(), name: 'Cena', tracks: [], sfx: [] })
    scenes[0].sfx.push(...legacySfx)
  }
  return { version: 2, scenes, master: clamp(d.master ?? 80) }
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
  /** true while the active scene plays its battle tracks instead of its music. */
  battle: false,
  status: {} as Record<string, PlayerStatus>,
  errors: {} as Record<string, string>,
  titles: {} as Record<string, string>,
  showHelp: false,
})

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

// Write the normalized session once now (so an old-format file is migrated on
// disk right away), then on every change. $effect.root lets us do this outside
// a component.
persist()
$effect.root(() => {
  $effect(persist)
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
      const sfx = findSfx(id)
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
  for (const scene of session.scenes) {
    const track = scene.tracks.find((t) => t.id === id)
    if (track) return track
  }
  return undefined
}

function findSfx(id: string): Sfx | undefined {
  for (const scene of session.scenes) {
    const sfx = scene.sfx.find((s) => s.id === id)
    if (sfx) return sfx
  }
  return undefined
}

/** Scene tracks fade over FADE_MS; SFX are cut instantly. */
function fadeFor(id: string): number {
  return findTrack(id) ? FADE_MS : 0
}

/**
 * Tracks a scene start plays: its music or battle track, whichever mode is
 * on, plus the first ambience track. Other ambience tracks are alternatives
 * the user can start by hand.
 */
function sceneTargets(scene: Scene): Track[] {
  const mode: Group = runtime.battle ? 'battle' : 'music'
  const out = scene.tracks.filter((t) => t.group === mode)
  const ambience = scene.tracks.find((t) => t.group === 'ambience')
  if (ambience) out.push(ambience)
  return out
}

// ---------------------------------------------------------------------------
// Playback control
// ---------------------------------------------------------------------------

export function isPlaying(id: string): boolean {
  const s = runtime.status[id]
  return s === 'playing' || s === 'fading'
}

export function viewScene(sceneId: string) {
  runtime.viewSceneId = sceneId
}

/**
 * Fade the scene in with its ambience plus music or battle, whichever mode
 * is on. Every other scene track fades out, so switching scenes or modes is
 * a crossfade. Tracks that were not already playing start over (see
 * TrackPlayer.play); ones already playing are left alone.
 */
function startScene(sceneId: string) {
  const scene = session.scenes.find((s) => s.id === sceneId)
  if (!scene) return
  runtime.activeSceneId = sceneId
  runtime.viewSceneId = sceneId
  const wanted = new Set(sceneTargets(scene).map((t) => t.id))
  for (const [id, player] of players) {
    if (wanted.has(id)) continue
    if (player.active && findTrack(id)) player.stop(FADE_MS)
  }
  pendingPlays.clear()
  for (const id of wanted) {
    const player = players.get(id)
    if (!player) pendingPlays.set(id, FADE_MS)
    else if (!player.active) player.play(FADE_MS)
  }
}

/** Scene start: ambience and music. Battle is an explicit step from there. */
export function activateScene(sceneId: string) {
  runtime.battle = false
  startScene(sceneId)
}

/**
 * Switch the scene between music and battle. Music fades out while battle
 * fades in, or the reverse; ambience keeps playing. On a scene that is not
 * active this also activates it, straight into the chosen mode.
 */
function setBattle(sceneId: string, on: boolean) {
  runtime.battle = on
  startScene(sceneId)
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
  runtime.battle = false
  pendingPlays.clear()
  for (const [id, player] of players) player.stop(immediate ? 0 : fadeFor(id))
}

/** Play button on a track card. Starting always restarts, same as a scene start. */
export function toggleTrack(track: Track) {
  const player = players.get(track.id)
  if (!player) return
  if (player.active) {
    player.stop(FADE_MS)
    return
  }
  if (track.group !== 'ambience') {
    const scene = session.scenes.find((s) => s.tracks.includes(track))
    if (scene && runtime.activeSceneId === scene.id) {
      // Playing music or battle in the active scene switches the mode:
      // the other group fades out while this one fades in.
      setBattle(scene.id, track.group === 'battle')
      return
    }
    // Scene not active: still never let music and battle overlap.
    for (const other of scene?.tracks ?? []) {
      if (other.group === 'ambience' || other.group === track.group) continue
      const p = players.get(other.id)
      if (p?.active) p.stop(FADE_MS)
    }
  }
  player.play(FADE_MS)
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

/**
 * Browsers that refuse muted playback before a user gesture leave players
 * unbuffered; call this on the first click or key press to retry.
 */
export function primeAll() {
  for (const player of players.values()) player.prime()
}

export function playSfx(sfx: Sfx) {
  players.get(sfx.id)?.playOnce()
}

// ---------------------------------------------------------------------------
// Session editing
// ---------------------------------------------------------------------------

export function addScene(name = 'Nova cena'): Scene {
  const scene: Scene = { id: uid(), name, tracks: [], sfx: [] }
  session.scenes.push(scene)
  viewScene(scene.id)
  // Return the reactive proxy, not the plain object we pushed.
  return session.scenes[session.scenes.length - 1]
}

export function removeScene(sceneId: string) {
  const index = session.scenes.findIndex((s) => s.id === sceneId)
  if (index < 0) return
  for (const track of session.scenes[index].tracks) unregisterPlayer(track.id)
  for (const sfx of session.scenes[index].sfx) unregisterPlayer(sfx.id)
  session.scenes.splice(index, 1)
  if (runtime.activeSceneId === sceneId) runtime.activeSceneId = null
  if (runtime.viewSceneId === sceneId) runtime.viewSceneId = session.scenes[Math.max(0, index - 1)]?.id ?? null
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

export function addTrack(sceneId: string, group: Group, ytId: string, kind: Kind, title = ''): Track | null {
  const scene = session.scenes.find((s) => s.id === sceneId)
  if (!scene) return null
  // Music and battle take a single track (a playlist covers variety); ambience can layer.
  if (group !== 'ambience' && scene.tracks.some((t) => t.group === group)) return null
  const track: Track = {
    id: uid(),
    ytId,
    kind,
    title,
    volume: 70,
    shuffle: false,
    group,
  }
  scene.tracks.push(track)
  return track
}

/** Moves a track to position `target` among the tracks of its own group. */
export function moveTrackTo(sceneId: string, trackId: string, target: number) {
  const scene = session.scenes.find((s) => s.id === sceneId)
  const track = scene?.tracks.find((t) => t.id === trackId)
  if (!scene || !track) return
  const group = scene.tracks.filter((t) => t.group === track.group && t.id !== trackId)
  target = Math.max(0, Math.min(group.length, target))
  group.splice(target, 0, track)
  // Groups are shown separately, so their relative order in the array does not matter.
  scene.tracks = [...scene.tracks.filter((t) => t.group !== track.group), ...group]
}

export function removeTrack(sceneId: string, trackId: string) {
  const scene = session.scenes.find((s) => s.id === sceneId)
  if (!scene) return
  unregisterPlayer(trackId)
  scene.tracks = scene.tracks.filter((t) => t.id !== trackId)
}

export function addSfx(sceneId: string, ytId: string, title = ''): Sfx | null {
  const scene = session.scenes.find((s) => s.id === sceneId)
  if (!scene) return null
  const sfx: Sfx = { id: uid(), ytId, title, volume: 100 }
  scene.sfx.push(sfx)
  return sfx
}

export function removeSfx(sceneId: string, sfxId: string) {
  const scene = session.scenes.find((s) => s.id === sceneId)
  if (!scene) return
  unregisterPlayer(sfxId)
  scene.sfx = scene.sfx.filter((s) => s.id !== sfxId)
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
  session.master = data.master
  runtime.activeSceneId = null
  runtime.battle = false
  runtime.viewSceneId = session.scenes[0]?.id ?? null
}
