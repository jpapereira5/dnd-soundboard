<script lang="ts">
  import { untrack } from 'svelte'
  import { registerPlayer, unregisterPlayer, type RegisterOptions } from '../lib/state.svelte'

  let { id, options }: { id: string; options: RegisterOptions } = $props()

  let host = $state<HTMLDivElement>()

  // Only `id` and `host` are tracked. Volume/loop changes are pushed to
  // the existing player through applyTrackSettings, never by recreating it.
  // Every scene is mounted at startup, so all players load right away.
  $effect(() => {
    if (!host) return
    const el = host
    untrack(() => registerPlayer(id, el, options))
    return () => unregisterPlayer(id)
  })
</script>

<div class="player-host" bind:this={host}></div>
