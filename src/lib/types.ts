export type Kind = 'video' | 'playlist'

/**
 * Where a track sits inside its scene.
 * - ambience: always on while the scene plays.
 * - music / battle: one or the other. Switching fades the other group out.
 */
export type Group = 'ambience' | 'music' | 'battle'

export const GROUPS: { id: Group; label: string }[] = [
  { id: 'ambience', label: 'Ambiente' },
  { id: 'music', label: 'Música' },
  { id: 'battle', label: 'Batalha' },
]

export interface Track {
  id: string
  ytId: string
  kind: Kind
  title: string
  /** 0..100 */
  volume: number
  /** playlists only */
  shuffle: boolean
  group: Group
}

export interface Sfx {
  id: string
  ytId: string
  title: string
  /** 0..100 */
  volume: number
}

export interface Scene {
  id: string
  name: string
  tracks: Track[]
  /** One-shot effects of this scene, fired by button or key. */
  sfx: Sfx[]
}

/** Fade in/out time used everywhere: scenes, tracks and the loop crossfade. */
export const FADE_MS = 6000

export interface Session {
  version: 2
  scenes: Scene[]
  /** 0..100 */
  master: number
  /** 0..100, applied on top of master to ambience tracks only. */
  ambienceMaster: number
}

/** 'fading' is a fade in; 'stopping' a fade out. */
export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'fading' | 'stopping' | 'error'

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
