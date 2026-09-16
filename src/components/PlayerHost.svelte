<script lang="ts">
  import { untrack } from 'svelte'
  import { registerPlayer, unregisterPlayer, type RegisterOptions } from '../lib/state.svelte'

  let { id, ytId, kind, options }: { id: string; ytId: string; kind: string; options: RegisterOptions } = $props()

  let host = $state<HTMLDivElement>()

  // The player is built once per host and rebuilt only when the track points
  // at another video (a synced session can do that). The effect may re-run
  // for other reasons, so it compares the video itself instead of relying on
  // Svelte's teardown: tearing down here would reload the iframe and cut the
  // sound. Volume and shuffle changes go through applyTrackSettings.
  let current = ''
  $effect(() => {
    if (!host) return
    const next = `${ytId}|${kind}`
    const el = host
    untrack(() => {
      if (next === current) return
      current = next
      registerPlayer(id, el, options)
    })
  })

  // Only on unmount: the track was removed.
  $effect(() => () => unregisterPlayer(untrack(() => id)))
</script>

<div class="player-host" bind:this={host}></div>
