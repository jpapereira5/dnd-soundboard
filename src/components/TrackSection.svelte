<script lang="ts">
  import type { Group, Scene } from '../lib/types'
  import { GROUPS } from '../lib/types'
  import { groupIsOn, addTrack } from '../lib/state.svelte'
  import TrackCard from './TrackCard.svelte'
  import AddMediaForm from './AddMediaForm.svelte'

  let { scene, group }: { scene: Scene; group: Group } = $props()

  const meta = $derived(GROUPS.find((g) => g.id === group)!)
  const tracks = $derived(scene.tracks.filter((t) => t.group === group))
  /** Music and battle hold one track each, on one line; ambience can layer several. */
  const single = $derived(group !== 'ambience')
  const canAdd = $derived(!single || tracks.length === 0)
  /** This group is sounding in the active scene. */
  const on = $derived(groupIsOn(scene.id, group))
  const hint = $derived(
    on ? 'a tocar' : group === 'ambience' ? 'toca sempre com a cena' : group === 'battle' ? 'tocar substitui a música' : 'tocar substitui a batalha',
  )
</script>

<section class="group" class:on class:single>
  <div class="row head">
    <h3>{meta.label}</h3>
    <span class="muted hint">{hint}</span>
  </div>

  <div class="body">
    {#if tracks.length === 0}
      <p class="muted empty">{meta.hint}</p>
    {/if}
    {#each tracks as track (track.id)}
      <TrackCard {track} sceneId={scene.id} />
    {/each}
    {#if canAdd}
      <AddMediaForm label="Adicionar" allowPlaylist onadd={(ytId, kind, title) => addTrack(scene.id, group, ytId, kind, title)} />
    {/if}
  </div>
</section>

<style>
  .group {
    padding: 0.8rem 1rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--bg-2) 60%, transparent);
  }
  .group.on {
    border-color: var(--accent-2);
  }
  .head {
    margin-bottom: 0.6rem;
  }
  h3 {
    margin: 0;
    font-size: 1rem;
    min-width: 5rem;
  }
  .single .head {
    flex: 0 0 auto;
    flex-wrap: nowrap;
  }
  .hint {
    font-size: 0.85rem;
  }
  .empty {
    margin: 0;
    font-size: 0.9rem;
  }
  .body {
    display: grid;
    gap: 0.5rem;
  }
  .group :global(form.add) {
    margin-top: 0.6rem;
  }

  /* Single-track groups: heading, mode button and the track on one line. */
  .single {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex-wrap: wrap;
  }
  .single .head {
    margin: 0;
  }
  .single .body {
    flex: 1 1 24rem;
    min-width: 0;
  }
  .single .empty {
    display: none;
  }
  .single :global(form.add) {
    margin-top: 0;
  }
</style>
