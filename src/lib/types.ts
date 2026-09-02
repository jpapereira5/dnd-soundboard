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
  fadeMs: number
}

export interface Scene {
  id: string
  name: string
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
  /** fade used when switching scenes */
  crossfadeMs: number
  /** collapse the video area of every player, audio keeps playing */
  hideVideo: boolean
}

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'fading' | 'error'

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
