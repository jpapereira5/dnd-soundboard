<script lang="ts">
  import { untrack } from 'svelte'
  import { session } from '../lib/state.svelte'
  import type { RegisterOptions } from '../lib/state.svelte'
  import PlayerHost from './PlayerHost.svelte'

  // Every YouTube player lives here, outside the cards, in an order that
  // never changes (by id). Moving an <iframe> in the DOM reloads it, so
  // cards and panels can be reordered freely without touching playback.
  // Only ids and videos are tracked here. Volume, shuffle and end point are
  // read untracked: they are initial values for a new player, and later
  // changes reach existing players through applyTrackSettings, so a slider
  // move must not recompute this list.
  const all = $derived.by(() => {
    const list: { id: string; options: RegisterOptions }[] = []
    for (const scene of session.scenes) {
      for (const t of scene.tracks) {
        const init = untrack(() => ({ shuffle: t.shuffle, volume: t.volume, endAt: t.endAt }))
        list.push({ id: t.id, options: { ytId: t.ytId, kind: t.kind, loop: true, ...init } })
      }
      for (const s of scene.sfx) {
        const volume = untrack(() => s.volume)
        list.push({ id: s.id, options: { ytId: s.ytId, kind: 'video', loop: false, shuffle: false, volume } })
      }
    }
    return list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  })
</script>

<div class="players">
  {#each all as p (p.id)}
    <PlayerHost id={p.id} ytId={p.options.ytId} kind={p.options.kind} options={p.options} />
  {/each}
</div>

<style>
  .players {
    position: relative;
    height: 0;
    overflow: hidden;
  }
</style>
