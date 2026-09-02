import type { Kind, PlayerStatus } from './types'

declare global {
  interface Window {
    YT?: typeof YT
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<typeof YT> | null = null

/** Injects the IFrame API script once and resolves when `YT.Player` is usable. */
export function loadYouTubeApi(): Promise<typeof YT> {
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT)
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT!)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  })
  return apiPromise
}

export interface TrackPlayerOptions {
  ytId: string
  kind: Kind
  loop: boolean
  shuffle: boolean
  /** 0..1 */
  gain: number
  /** 0..1 */
  master: number
  onStatus?: (status: PlayerStatus, detail?: string) => void
  onTitle?: (title: string) => void
}

const FADE_STEP_MS = 40

/**
 * Wraps one YT.Player. Volume applied = 100 * gain * master * level^2,
 * where `level` (0..1) is the fade envelope. The square makes fades sound
 * linear to the ear, since YouTube's volume scale is amplitude-linear.
 */
export class TrackPlayer {
  private player: YT.Player | null = null
  private ready = false
  private destroyed = false
  private fadeTimer: number | null = null
  private pendingPlay: number | null = null
  private level = 0
  /** true between play() and the end of stop() */
  active = false
  gain: number
  master: number
  loop: boolean
  shuffle: boolean
  readonly kind: Kind
  readonly ytId: string
  private onStatus?: TrackPlayerOptions['onStatus']
  private onTitle?: TrackPlayerOptions['onTitle']

  constructor(host: HTMLElement, opts: TrackPlayerOptions) {
    this.ytId = opts.ytId
    this.kind = opts.kind
    this.loop = opts.loop
    this.shuffle = opts.shuffle
    this.gain = opts.gain
    this.master = opts.master
    this.onStatus = opts.onStatus
    this.onTitle = opts.onTitle

    // The API replaces the target element with the iframe, so give it a
    // throwaway child rather than a node Svelte owns.
    const target = document.createElement('div')
    host.appendChild(target)
    this.onStatus?.('loading')

    loadYouTubeApi().then((yt) => {
      if (this.destroyed) return
      const playerVars: YT.PlayerVars = {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        rel: 0,
        playsinline: 1,
        origin: window.location.origin,
      }
      if (this.kind === 'playlist') {
        playerVars.listType = 'playlist'
        playerVars.list = this.ytId
        playerVars.loop = this.loop ? 1 : 0
      }
      // Only set videoId for videos: the API rejects an explicit undefined.
      this.player = new yt.Player(target, {
        width: '100%',
        height: '100%',
        ...(this.kind === 'video' ? { videoId: this.ytId } : {}),
        playerVars,
        events: {
          onReady: () => this.handleReady(),
          onStateChange: (e) => this.handleState(e.data),
          onError: (e) => this.handleError(e.data),
        },
      })
    })
  }

  private handleReady() {
    if (this.destroyed || !this.player) return
    this.ready = true
    this.applyVolume()
    if (this.kind === 'playlist') {
      this.player.setLoop(this.loop)
      this.player.setShuffle(this.shuffle)
    }
    this.emitTitle()
    if (this.pendingPlay !== null) {
      const fade = this.pendingPlay
      this.pendingPlay = null
      this.play(fade)
    } else {
      this.onStatus?.('idle')
    }
  }

  private handleState(state: YT.PlayerState) {
    if (this.destroyed || !this.player) return
    const S = YT.PlayerState
    if (state === S.PLAYING) {
      this.emitTitle()
      if (this.active) this.onStatus?.(this.fadeTimer ? 'fading' : 'playing')
    } else if (state === S.ENDED) {
      if (this.active && this.loop && this.kind === 'video') {
        this.player.seekTo(0, true)
        this.player.playVideo()
      } else if (this.active) {
        // Playlist loops are handled by YouTube itself, so ENDED here means "really over".
        this.active = false
        this.onStatus?.('idle')
      }
    }
  }

  private handleError(code: number) {
    const messages: Record<number, string> = {
      2: 'ID inválido',
      5: 'erro do leitor HTML5',
      100: 'vídeo não encontrado',
      101: 'o autor não permite embed',
      150: 'o autor não permite embed',
    }
    this.active = false
    this.onStatus?.('error', messages[code] ?? `erro ${code}`)
  }

  private emitTitle() {
    const data = (this.player as unknown as { getVideoData?: () => { title?: string } }).getVideoData?.()
    if (data?.title) this.onTitle?.(data.title)
  }

  private applyVolume() {
    if (!this.ready || !this.player) return
    const v = Math.round(100 * this.gain * this.master * this.level * this.level)
    this.player.setVolume(Math.max(0, Math.min(100, v)))
  }

  private cancelFade() {
    if (this.fadeTimer !== null) {
      clearInterval(this.fadeTimer)
      this.fadeTimer = null
    }
  }

  private fadeTo(target: number, ms: number, done?: () => void) {
    this.cancelFade()
    if (ms <= 0) {
      this.level = target
      this.applyVolume()
      done?.()
      return
    }
    const from = this.level
    const start = performance.now()
    this.fadeTimer = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / ms)
      this.level = from + (target - from) * t
      this.applyVolume()
      if (t >= 1) {
        this.cancelFade()
        done?.()
      }
    }, FADE_STEP_MS)
  }

  play(fadeMs: number) {
    if (this.destroyed) return
    if (!this.ready || !this.player) {
      this.pendingPlay = fadeMs
      this.onStatus?.('loading')
      return
    }
    this.active = true
    if (this.fadeTimer === null && this.level > 0) {
      // Already playing at full level, nothing to do.
      this.player.playVideo()
      this.onStatus?.('playing')
      return
    }
    this.onStatus?.('fading')
    this.applyVolume()
    this.player.playVideo()
    this.fadeTo(1, fadeMs, () => this.onStatus?.('playing'))
  }

  /** One-shot from the start, no fade in. Used by SFX. */
  playOnce() {
    if (this.destroyed) return
    if (!this.ready || !this.player) {
      this.pendingPlay = 0
      return
    }
    this.cancelFade()
    this.active = true
    this.level = 1
    this.applyVolume()
    this.player.seekTo(0, true)
    this.player.playVideo()
    this.onStatus?.('playing')
  }

  stop(fadeMs: number) {
    if (this.destroyed) return
    this.pendingPlay = null
    if (!this.ready || !this.player || !this.active) {
      this.active = false
      this.onStatus?.('idle')
      return
    }
    this.onStatus?.('fading')
    this.fadeTo(0, fadeMs, () => {
      this.active = false
      this.player?.pauseVideo()
      this.onStatus?.('idle')
    })
  }

  setGain(gain: number) {
    this.gain = gain
    this.applyVolume()
  }

  setMaster(master: number) {
    this.master = master
    this.applyVolume()
  }

  setLoop(loop: boolean) {
    this.loop = loop
    if (this.kind === 'playlist' && this.ready) this.player?.setLoop(loop)
  }

  setShuffle(shuffle: boolean) {
    this.shuffle = shuffle
    if (this.kind === 'playlist' && this.ready) this.player?.setShuffle(shuffle)
  }

  nextInPlaylist() {
    if (this.kind === 'playlist' && this.ready) this.player?.nextVideo()
  }

  destroy() {
    this.destroyed = true
    this.cancelFade()
    this.player?.destroy()
    this.player = null
  }
}
