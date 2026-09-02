<script lang="ts">
  import { untrack } from 'svelte'
  import { registerPlayer, unregisterPlayer, type RegisterOptions } from '../lib/state.svelte'

  let { id, armed, options }: { id: string; armed: boolean; options: RegisterOptions } = $props()

  let host = $state<HTMLDivElement>()

  // Only `id`, `armed` and `host` are tracked. Volume/loop changes are pushed to
  // the existing player through applyTrackSettings, never by recreating it.
  $effect(() => {
    if (!armed || !host) return
    const el = host
    untrack(() => registerPlayer(id, el, options))
    return () => unregisterPlayer(id)
  })
</script>

<div class="player-host" bind:this={host}></div>
