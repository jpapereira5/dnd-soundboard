<script lang="ts">
  import type { Group, Scene } from '../lib/types'
  import { GROUPS } from '../lib/types'
  import { runtime, groupIsOn, setBattle, addTrack } from '../lib/state.svelte'
  import TrackCard from './TrackCard.svelte'
  import AddMediaForm from './AddMediaForm.svelte'

  let { scene, group }: { scene: Scene; group: Group } = $props()

  const meta = GROUPS.find((g) => g.id === group)!
  const tracks = $derived(scene.tracks.filter((t) => t.group === group))
  /** This group is sounding in the active scene. */
  const on = $derived(groupIsOn(scene.id, group))
  const sceneActive = $derived(runtime.activeSceneId === scene.id)
</script>

<section class="group" class:on>
  <header class="row head">
    <h3>{meta.label}</h3>
    {#if group === 'music' || group === 'battle'}
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
  </header>

  {#if tracks.length === 0}
    <p class="muted empty">{meta.hint}</p>
  {/if}

  <div class="grid">
    {#each tracks as track (track.id)}
      <TrackCard {track} sceneId={scene.id} />
    {/each}
  </div>

  <AddMediaForm label="Adicionar" allowPlaylist onadd={(ytId, kind, title) => addTrack(scene.id, group, ytId, kind, title)} />
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
  .grid {
    display: grid;
    gap: 0.5rem;
  }
  .group :global(form.add) {
    margin-top: 0.6rem;
  }
</style>
