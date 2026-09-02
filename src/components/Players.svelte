<script lang="ts">
  import { session } from '../lib/state.svelte'
  import type { RegisterOptions } from '../lib/state.svelte'
  import PlayerHost from './PlayerHost.svelte'

  // Every YouTube player lives here, outside the cards, in an order that
  // never changes (by id). Moving an <iframe> in the DOM reloads it, so
  // cards and panels can be reordered freely without touching playback.
  const all = $derived.by(() => {
    const list: { id: string; options: RegisterOptions }[] = []
    for (const scene of session.scenes) {
      for (const t of scene.tracks) list.push({ id: t.id, options: { ytId: t.ytId, kind: t.kind, loop: true, shuffle: t.shuffle, volume: t.volume } })
      for (const s of scene.sfx) list.push({ id: s.id, options: { ytId: s.ytId, kind: 'video', loop: false, shuffle: false, volume: s.volume } })
    }
    return list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  })
</script>

<div class="players">
  {#each all as p (p.id)}
    <PlayerHost id={p.id} options={p.options} />
  {/each}
</div>

<style>
  .players {
    position: relative;
    height: 0;
    overflow: hidden;
  }
</style>
