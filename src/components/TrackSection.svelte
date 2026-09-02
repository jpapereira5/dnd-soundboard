<script lang="ts">
  import type { Group, Scene } from '../lib/types'
  import { GROUPS } from '../lib/types'
  import { addTrack } from '../lib/state.svelte'
  import TrackCard from './TrackCard.svelte'
  import AddMediaForm from './AddMediaForm.svelte'

  let { scene, group }: { scene: Scene; group: Group } = $props()

  const meta = $derived(GROUPS.find((g) => g.id === group)!)
  const tracks = $derived(scene.tracks.filter((t) => t.group === group))
  /** Music and battle hold one track each, on one line; ambience can layer several. */
  const single = $derived(group !== 'ambience')
  const canAdd = $derived(!single || tracks.length === 0)
</script>

<div class="group" class:single>
  <h3>{meta.label}</h3>
  <div class="body">
    {#each tracks as track (track.id)}
      <TrackCard {track} sceneId={scene.id} />
    {/each}
    {#if canAdd}
      <AddMediaForm label="Adicionar" allowPlaylist onadd={(ytId, kind, title) => addTrack(scene.id, group, ytId, kind, title)} />
    {/if}
  </div>
</div>

<style>
  h3 {
    margin: 0 0 0.6rem;
    font-size: 1rem;
  }
  .body {
    display: grid;
    gap: 0.5rem;
  }
  .group :global(form.add) {
    margin-top: 0.6rem;
  }

  /* Single-track groups: heading and the track on one line. */
  .single {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex-wrap: wrap;
  }
  .single h3 {
    margin: 0;
    flex: 0 0 5rem;
  }
  .single .body {
    flex: 1 1 24rem;
    min-width: 0;
  }
  .single :global(form.add) {
    margin-top: 0;
  }
</style>
