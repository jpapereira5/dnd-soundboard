<script lang="ts">
  import type { Track } from '../lib/types'
  import { runtime, isPlaying, toggleTrack, removeTrack, applyTrackSettings, nextInPlaylist } from '../lib/state.svelte'
  import PlayerHost from './PlayerHost.svelte'

  let { track, sceneId, armed }: { track: Track; sceneId: string; armed: boolean } = $props()

  const status = $derived(runtime.status[track.id] ?? 'idle')
  const nowTitle = $derived(runtime.titles[track.id] ?? '')
  const playing = $derived(isPlaying(track.id))
</script>

<div class="card track" class:playing>
  <PlayerHost
    id={track.id}
    {armed}
    options={{ ytId: track.ytId, kind: track.kind, loop: track.loop, shuffle: track.shuffle, volume: track.volume }}
  />
  <div class="body">
    <div class="row head">
      <span class="status-dot {status}" title={status}></span>
      <input
        class="title"
        type="text"
        bind:value={track.title}
        placeholder={nowTitle || (track.kind === 'playlist' ? 'Playlist' : 'Vídeo')}
      />
      <button class="icon danger" title="Remover track" onclick={() => removeTrack(sceneId, track.id)}>✕</button>
    </div>

    {#if track.kind === 'playlist' && nowTitle}
      <div class="now muted" title={nowTitle}>♪ {nowTitle}</div>
    {/if}
    {#if status === 'error'}
      <div class="error">Erro: {runtime.errors[track.id]}</div>
    {/if}

    <div class="row">
      <button class:primary={playing} disabled={!armed || status === 'error'} onclick={() => toggleTrack(track)}>
        {playing ? '■ Parar' : '▶ Tocar'}
      </button>
      {#if track.kind === 'playlist'}
        <button disabled={!armed} onclick={() => nextInPlaylist(track)}>⏭ Seguinte</button>
      {/if}
      <span class="muted kind">{track.kind === 'playlist' ? 'playlist' : 'vídeo'}</span>
    </div>

    <label class="vol">
      <span class="muted">Vol</span>
      <input type="range" min="0" max="100" bind:value={track.volume} oninput={() => applyTrackSettings(track)} />
      <span class="num">{track.volume}</span>
    </label>

    <div class="row opts">
      <label><input type="checkbox" bind:checked={track.loop} onchange={() => applyTrackSettings(track)} /> Loop</label>
      {#if track.kind === 'playlist'}
        <label><input type="checkbox" bind:checked={track.shuffle} onchange={() => applyTrackSettings(track)} /> Shuffle</label>
      {/if}
      <label class="fade">
        Fade
        <input type="number" min="0" step="500" bind:value={track.fadeMs} />
        <span class="muted">ms</span>
      </label>
    </div>
  </div>
</div>

<style>
  .track.playing {
    border-color: var(--accent-2);
    box-shadow: 0 0 0 1px var(--accent-2);
  }
  .body {
    padding: 0.7rem 0.8rem 0.8rem;
    display: grid;
    gap: 0.5rem;
  }
  .head {
    flex-wrap: nowrap;
  }
  .title {
    flex: 1;
    min-width: 0;
    background: transparent;
    border-color: transparent;
    padding-left: 0.3rem;
  }
  .title:hover,
  .title:focus {
    border-color: var(--line);
  }
  .now {
    font-size: 0.85rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .error {
    color: #ffb3ad;
    font-size: 0.85rem;
  }
  .kind {
    margin-left: auto;
    font-size: 0.8rem;
  }
  .vol {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .num {
    width: 2.2em;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .opts {
    font-size: 0.9rem;
  }
  .opts label {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .fade {
    margin-left: auto;
  }
  .fade input {
    width: 5.5em;
    padding: 0.2rem 0.4rem;
  }
</style>
