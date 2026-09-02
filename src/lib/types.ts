export type Kind = 'video' | 'playlist'

export interface Track {
  id: string
  ytId: string
  kind: Kind
  title: string
  /** 0..100 */
  volume: number
  loop: boolean
  shuffle: boolean
}

export interface Scene {
  id: string
  name: string
  /** fade in/out time for every track in the scene */
  fadeMs: number
  tracks: Track[]
}

export interface Sfx {
  id: string
  ytId: string
  title: string
  /** 0..100 */
  volume: number
}

export interface Session {
  version: 1
  scenes: Scene[]
  sfx: Sfx[]
  /** 0..100 */
  master: number
}

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'fading' | 'error'

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
