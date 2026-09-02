<script lang="ts">
  import type { Scene } from '../lib/types'
  import { runtime, activateScene, fadeOutScene, removeScene, moveScene, addTrack } from '../lib/state.svelte'
  import TrackCard from './TrackCard.svelte'
  import AddMediaForm from './AddMediaForm.svelte'

  let { scene }: { scene: Scene } = $props()

  const armed = $derived(runtime.armed.includes(scene.id))
  const active = $derived(runtime.activeSceneId === scene.id)

  function remove() {
    if (scene.tracks.length === 0 || confirm(`Apagar a cena "${scene.name}" e as suas ${scene.tracks.length} tracks?`)) {
      removeScene(scene.id)
    }
  }
</script>

<section class="scene">
  <div class="row head">
    <input class="name" type="text" bind:value={scene.name} />
    <button class="primary" onclick={() => activateScene(scene.id)}>▶ Fade in</button>
    <button disabled={!active} onclick={() => fadeOutScene(scene.id)}>■ Fade out</button>
    <span class="grow"></span>
    <button class="icon" title="Mover para a esquerda" onclick={() => moveScene(scene.id, -1)}>←</button>
    <button class="icon" title="Mover para a direita" onclick={() => moveScene(scene.id, 1)}>→</button>
    <button class="danger" onclick={remove}>Apagar cena</button>
  </div>

  {#if scene.tracks.length === 0}
    <p class="muted">Sem tracks. Cola um link do YouTube em baixo.</p>
  {/if}

  <div class="grid">
    {#each scene.tracks as track (track.id)}
      <TrackCard {track} sceneId={scene.id} {armed} />
    {/each}
  </div>

  <AddMediaForm label="Adicionar track" allowPlaylist onadd={(ytId, kind, title) => addTrack(scene.id, ytId, kind, title)} />
</section>

<style>
  .scene {
    padding: 1rem 1.2rem;
  }
  .head {
    margin-bottom: 1rem;
  }
  .name {
    font-size: 1.2rem;
    font-weight: 600;
    min-width: 12rem;
  }
  .grow {
    flex: 1;
  }
  .grid {
    display: grid;
    gap: 0.5rem;
  }
</style>
