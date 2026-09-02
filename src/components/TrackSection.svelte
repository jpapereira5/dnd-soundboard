<script lang="ts">
  import type { Group, Scene } from '../lib/types'
  import { GROUPS } from '../lib/types'
  import { runtime, groupIsOn, setBattle, addTrack } from '../lib/state.svelte'
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
  const sceneActive = $derived(runtime.activeSceneId === scene.id)
</script>

<section class="group" class:on class:single>
  <div class="row head">
    <h3>{meta.label}</h3>
    {#if single}
      <button
        class:primary={on}
        title={on
          ? `${meta.label} a tocar`
          : sceneActive
            ? `Fade out ao que toca agora, fade in a ${meta.label.toLowerCase()}`
            : `Ativar a cena já em ${meta.label.toLowerCase()}`}
        onclick={() => setBattle(scene.id, group === 'battle')}
      >
        {group === 'battle' ? '⚔️ Batalha' : '🎵 Música'}
      </button>
    {:else}
      <span class="muted hint">{on ? 'a tocar' : 'toca sempre com a cena'}</span>
    {/if}
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
    min-width: 6rem;
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
    flex: 0 0 auto;
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
