<script lang="ts">
  import { parseYouTube } from '../lib/url'
  import type { Kind } from '../lib/types'

  let {
    label,
    allowPlaylist = false,
    onadd,
  }: { label: string; allowPlaylist?: boolean; onadd: (ytId: string, kind: Kind, title: string) => void } = $props()

  let url = $state('')
  let title = $state('')
  let error = $state('')
  let prefer = $state<Kind>('playlist')

  const hasBoth = $derived.by(() => {
    const p = parseYouTube(url)
    return allowPlaylist && !!p?.videoId && !!p?.playlistId
  })

  function submit(e: Event) {
    e.preventDefault()
    const p = parseYouTube(url)
    if (!p) {
      error = 'Link do YouTube inválido'
      return
    }
    if (allowPlaylist && p.playlistId && (!p.videoId || prefer === 'playlist')) {
      onadd(p.playlistId, 'playlist', title.trim())
    } else if (p.videoId) {
      onadd(p.videoId, 'video', title.trim())
    } else {
      error = 'Efeitos têm de ser um vídeo, não uma playlist'
      return
    }
    url = ''
    title = ''
    error = ''
  }
</script>

<form class="add row" onsubmit={submit}>
  <input class="url" type="text" bind:value={url} placeholder="Link do YouTube{allowPlaylist ? ' (vídeo ou playlist)' : ''}" />
  <input class="name" type="text" bind:value={title} placeholder="Nome (opcional)" />
  {#if hasBoth}
    <select bind:value={prefer}>
      <option value="playlist">a playlist toda</option>
      <option value="video">só este vídeo</option>
    </select>
  {/if}
  <button type="submit" class="primary">{label}</button>
  {#if error}
    <span class="error">{error}</span>
  {/if}
</form>

<style>
  .add {
    margin-top: 1rem;
  }
  .url {
    flex: 1 1 18rem;
  }
  .name {
    flex: 0 1 12rem;
  }
  .error {
    color: #ffb3ad;
  }
</style>
