<script lang="ts">
  import { untrack } from 'svelte'
  import { registerPlayer, unregisterPlayer, type RegisterOptions } from '../lib/state.svelte'

  let { id, ytId, kind, options }: { id: string; ytId: string; kind: string; options: RegisterOptions } = $props()

  let host = $state<HTMLDivElement>()

  // Only `id`, the video and `host` are tracked, so the player is rebuilt
  // when the track points at another video (a synced session can do that)
  // and never for a volume or shuffle change, which applyTrackSettings
  // pushes to the existing player. Every scene is mounted at startup.
  $effect(() => {
    if (!host) return
    void ytId
    void kind
    const el = host
    untrack(() => registerPlayer(id, el, options))
    return () => unregisterPlayer(id)
  })
</script>

<div class="player-host" bind:this={host}></div>
