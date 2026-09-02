<script lang="ts">
  import type { Track } from '../lib/types'
  import { runtime, isPlaying, toggleTrack, removeTrack, applyTrackSettings, nextInPlaylist } from '../lib/state.svelte'

  let { track, sceneId }: { track: Track; sceneId: string } = $props()

  const status = $derived(runtime.status[track.id] ?? 'loading')
  const nowTitle = $derived(runtime.titles[track.id] ?? '')
  const playing = $derived(isPlaying(track.id))
  const hint = $derived(
    status === 'error'
      ? `Erro: ${runtime.errors[track.id]}`
      : status === 'loading'
        ? 'A carregar'
        : status === 'idle'
          ? 'Armada, pronta a tocar'
          : track.kind === 'playlist'
          ? `Playlist · a tocar: ${nowTitle || '—'}`
          : 'Vídeo',
  )

  function toggleShuffle() {
    track.shuffle = !track.shuffle
    applyTrackSettings(track)
  }
</script>

<div class="card track row" class:playing title={hint}>

  <span class="status-dot {status}"></span>
  <input
    class="title"
    type="text"
    bind:value={track.title}
    placeholder={nowTitle || (track.kind === 'playlist' ? 'Playlist' : 'Vídeo')}
  />
  {#if status === 'error'}
    <span class="error">{runtime.errors[track.id]}</span>
  {/if}

  <button class="play" class:primary={playing} disabled={status === 'error'} onclick={() => toggleTrack(track)}>
    {playing ? '■ Parar' : '▶ Tocar'}
  </button>
  {#if track.kind === 'playlist'}
    <button class="icon" title="Faixa seguinte" onclick={() => nextInPlaylist(track)}>⏭</button>
    <button class="icon" class:primary={track.shuffle} title="Shuffle" onclick={toggleShuffle}>🔀</button>
  {/if}

  <input class="vol" type="range" min="0" max="100" bind:value={track.volume} oninput={() => applyTrackSettings(track)} />
  <span class="num">{track.volume}</span>

  <button class="icon danger" title="Remover track" onclick={() => removeTrack(sceneId, track.id)}>✕</button>
</div>

<style>
  .track {
    padding: 0.5rem 0.7rem;
    flex-wrap: nowrap;
    overflow: visible;
  }
  .track.playing {
    border-color: var(--accent-2);
    box-shadow: 0 0 0 1px var(--accent-2);
  }
  /* Title takes all free space, so the controls sit on the right edge. */
  .title {
    flex: 1;
    min-width: 12rem;
    background: transparent;
    border-color: transparent;
    padding-left: 0.3rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .title:hover,
  .title:focus {
    border-color: var(--line);
  }
  .error {
    color: #ffb3ad;
    font-size: 0.85rem;
    white-space: nowrap;
  }
  .play {
    width: 6em;
    white-space: nowrap;
  }
  .vol {
    width: 10rem;
    flex: 0 0 auto;
  }
  .num {
    width: 2.2em;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  @media (max-width: 700px) {
    .track {
      flex-wrap: wrap;
    }
    .vol {
      flex: 1 1 8rem;
    }
  }
</style>
