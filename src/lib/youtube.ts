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
/** Overlap between the end of a looping video and its restart. */
const LOOP_CROSSFADE_MS = 4000
const LOOP_POLL_MS = 250

const ERROR_MESSAGES: Record<number, string> = {
  2: 'ID inválido',
  5: 'erro do leitor HTML5',
  100: 'vídeo não encontrado',
  101: 'o autor não permite embed',
  150: 'o autor não permite embed',
}

/**
 * One YT.Player plus its own fade envelope (`level`, 0..1).
 * Volume applied = 100 * gain * master * level^2; the square makes fades
 * sound linear to the ear, since YouTube's volume scale is amplitude-linear.
 */
class Voice {
  player: YT.Player | null = null
  ready = false
  level = 0
  private fadeTimer: number | null = null

  constructor(private readonly volumeFor: (level: number) => number) {}

  get fading(): boolean {
    return this.fadeTimer !== null
  }

  applyVolume() {
    if (!this.ready || !this.player) return
    const v = Math.round(this.volumeFor(this.level))
    this.player.setVolume(Math.max(0, Math.min(100, v)))
  }

  cancelFade() {
    if (this.fadeTimer !== null) {
      clearInterval(this.fadeTimer)
      this.fadeTimer = null
    }
  }

  fadeTo(target: number, ms: number, done?: () => void) {
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

  /** Silence and pause right away. */
  cut() {
    this.cancelFade()
    this.level = 0
    this.applyVolume()
    this.pause()
  }

  /** YT.Player only grows its methods after onReady, so guard every call. */
  pause() {
    if (this.ready) this.player?.pauseVideo()
  }

  seekToStart() {
    if (this.ready) this.player?.seekTo(0, true)
  }

  destroy() {
    this.cancelFade()
    this.player?.destroy()
    this.player = null
  }
}

/**
 * Wraps one track. Looping videos get two voices: while one plays, the
 * other waits at the start; near the end they crossfade so the loop has
 * no gap. Playlists and one-shots use a single voice.
 */
export class TrackPlayer {
  private voices: Voice[] = []
  private current = 0
  private ready = false
  private destroyed = false
  private pendingPlay: number | null = null
  private loopTimer: number | null = null
  private crossfading = false
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

    const voiceCount = this.kind === 'video' && this.loop ? 2 : 1
    this.onStatus?.('loading')
    for (let i = 0; i < voiceCount; i++) this.createVoice(host, i)
  }

  private createVoice(host: HTMLElement, index: number) {
    const voice = new Voice((level) => 100 * this.gain * this.master * level * level)
    this.voices.push(voice)
    // The API replaces the target element with the iframe, so give it a
    // throwaway child rather than a node Svelte owns.
    const target = document.createElement('div')
    host.appendChild(target)

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
      voice.player = new yt.Player(target, {
        width: '100%',
        height: '100%',
        ...(this.kind === 'video' ? { videoId: this.ytId } : {}),
        playerVars,
        events: {
          onReady: () => this.handleReady(index),
          onStateChange: (e) => this.handleState(index, e.data),
          onError: (e) => this.handleError(e.data),
        },
      })
    })
  }

  private get voice(): Voice {
    return this.voices[this.current]
  }

  private handleReady(index: number) {
    if (this.destroyed) return
    const voice = this.voices[index]
    voice.ready = true
    voice.applyVolume()
    if (index !== 0) return

    this.ready = true
    if (this.kind === 'playlist' && voice.player) {
      voice.player.setLoop(this.loop)
      voice.player.setShuffle(this.shuffle)
    }
    this.emitTitle(voice)
    if (this.pendingPlay !== null) {
      const fade = this.pendingPlay
      this.pendingPlay = null
      this.play(fade)
    } else {
      this.onStatus?.('idle')
    }
  }

  private handleState(index: number, state: YT.PlayerState) {
    if (this.destroyed) return
    const voice = this.voices[index]
    const S = YT.PlayerState
    if (state === S.PLAYING) {
      this.emitTitle(voice)
      if (index === this.current && this.active) this.onStatus?.(voice.fading ? 'fading' : 'playing')
    } else if (state === S.ENDED) {
      if (index !== this.current) {
        voice.pause()
        return
      }
      if (this.active && this.loop && this.kind === 'video' && voice.player) {
        // Fallback for when the crossfade could not start (duration unknown,
        // second voice not ready). Restarts with a small gap.
        voice.player.seekTo(0, true)
        voice.player.playVideo()
      } else if (this.active) {
        // Playlist loops are handled by YouTube itself, so ENDED here means "really over".
        this.active = false
        this.stopLoopWatch()
        this.onStatus?.('idle')
      }
    }
  }

  private handleError(code: number) {
    this.active = false
    this.stopLoopWatch()
    this.onStatus?.('error', ERROR_MESSAGES[code] ?? `erro ${code}`)
  }

  private emitTitle(voice: Voice) {
    const data = (voice.player as unknown as { getVideoData?: () => { title?: string } } | null)?.getVideoData?.()
    if (data?.title) this.onTitle?.(data.title)
  }

  // ---------------------------------------------------------------------
  // Gapless loop
  // ---------------------------------------------------------------------

  private startLoopWatch() {
    if (this.voices.length < 2 || this.loopTimer !== null) return
    this.loopTimer = window.setInterval(() => this.checkLoop(), LOOP_POLL_MS)
  }

  private stopLoopWatch() {
    if (this.loopTimer !== null) {
      clearInterval(this.loopTimer)
      this.loopTimer = null
    }
    this.crossfading = false
  }

  private checkLoop() {
    if (!this.active || this.crossfading) return
    const player = this.voice.player
    if (!this.voice.ready || !player) return
    const duration = player.getDuration()
    if (!duration || duration <= 0) return
    const overlap = Math.min(LOOP_CROSSFADE_MS, (duration * 1000) / 3)
    const remaining = (duration - player.getCurrentTime()) * 1000
    if (remaining <= overlap) this.loopCrossfade(overlap)
  }

  private loopCrossfade(ms: number) {
    const outgoing = this.voice
    const incoming = this.voices[1 - this.current]
    if (!incoming.ready || !incoming.player || !outgoing.player) return
    this.crossfading = true
    incoming.level = 0
    incoming.applyVolume()
    incoming.player.seekTo(0, true)
    incoming.player.playVideo()
    incoming.fadeTo(1, ms)
    outgoing.fadeTo(0, ms, () => {
      outgoing.pause()
      outgoing.seekToStart()
      this.crossfading = false
    })
    this.current = 1 - this.current
  }

  // ---------------------------------------------------------------------
  // Public control
  // ---------------------------------------------------------------------

  play(fadeMs: number) {
    if (this.destroyed) return
    const voice = this.voice
    if (!this.ready || !voice.player) {
      this.pendingPlay = fadeMs
      this.onStatus?.('loading')
      return
    }
    this.active = true
    for (const other of this.voices) if (other !== voice) other.cut()
    this.startLoopWatch()
    if (!voice.fading && voice.level > 0) {
      voice.player.playVideo()
      this.onStatus?.('playing')
      return
    }
    this.onStatus?.('fading')
    voice.applyVolume()
    voice.player.playVideo()
    voice.fadeTo(1, fadeMs, () => this.onStatus?.('playing'))
  }

  /** One-shot from the start, no fade in. Used by SFX. */
  playOnce() {
    if (this.destroyed) return
    const voice = this.voices[0]
    if (!this.ready || !voice.player) {
      this.pendingPlay = 0
      return
    }
    voice.cancelFade()
    this.active = true
    voice.level = 1
    voice.applyVolume()
    voice.player.seekTo(0, true)
    voice.player.playVideo()
    this.onStatus?.('playing')
  }

  stop(fadeMs: number) {
    if (this.destroyed) return
    this.pendingPlay = null
    this.stopLoopWatch()
    if (!this.ready || !this.active) {
      this.active = false
      this.onStatus?.('idle')
      return
    }
    this.onStatus?.('fading')
    const current = this.voice
    for (const voice of this.voices) {
      if (voice === current) continue
      if (voice.level > 0 || voice.fading) voice.fadeTo(0, fadeMs, () => voice.pause())
    }
    current.fadeTo(0, fadeMs, () => {
      this.active = false
      current.pause()
      this.onStatus?.('idle')
    })
  }

  setGain(gain: number) {
    this.gain = gain
    for (const voice of this.voices) voice.applyVolume()
  }

  setMaster(master: number) {
    this.master = master
    for (const voice of this.voices) voice.applyVolume()
  }

  setLoop(loop: boolean) {
    this.loop = loop
    if (this.kind === 'playlist' && this.ready) this.voices[0].player?.setLoop(loop)
  }

  setShuffle(shuffle: boolean) {
    this.shuffle = shuffle
    if (this.kind === 'playlist' && this.ready) this.voices[0].player?.setShuffle(shuffle)
  }

  nextInPlaylist() {
    if (this.kind === 'playlist' && this.ready) this.voices[0].player?.nextVideo()
  }

  destroy() {
    this.destroyed = true
    this.stopLoopWatch()
    for (const voice of this.voices) voice.destroy()
    this.voices = []
  }
}
