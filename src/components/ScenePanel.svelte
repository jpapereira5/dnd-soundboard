<script lang="ts">
  import type { Scene } from '../lib/types'
  import { runtime, activateScene, fadeOutScene, removeScene, addTrack } from '../lib/state.svelte'
  import type { Group } from '../lib/types'
  import TrackSection from './TrackSection.svelte'
  import SfxSection from './SfxSection.svelte'
  import AddMediaForm from './AddMediaForm.svelte'

  let { scene }: { scene: Scene } = $props()

  const active = $derived(runtime.activeSceneId === scene.id)

  const adder = (label: string, group: Group) => ({
    label,
    onadd: (ytId: string, kind: 'video' | 'playlist', title: string) => addTrack(scene.id, group, ytId, kind, title),
  })

  function remove() {
    const n = scene.tracks.length + scene.sfx.length
    if (n === 0 || confirm(`Apagar a cena "${scene.name}" e os seus ${n} sons?`)) {
      removeScene(scene.id)
    }
  }
</script>

<section class="scene">
  <div class="row head">
    <input class="name" type="text" bind:value={scene.name} />
    <div class="actions">
      <button class="primary" onclick={() => activateScene(scene.id)}>▶ Fade in</button>
      <button disabled={!active} onclick={() => fadeOutScene(scene.id)}>■ Fade out</button>
      <button class="danger delete" onclick={remove}>Apagar cena</button>
    </div>
  </div>

  <div class="sections">
    <!-- Music and battle share a box: one plays or the other. -->
    <div class="box stack">
      <TrackSection {scene} group="music" />
      <hr />
      <TrackSection {scene} group="battle" />
      <AddMediaForm allowPlaylist actions={[adder('+ Música', 'music'), adder('+ Batalha', 'battle')]} />
    </div>
    <div class="box stack">
      <TrackSection {scene} group="ambience" />
      <AddMediaForm allowPlaylist actions={[adder('+ Ambiente', 'ambience')]} />
    </div>
    <div class="box">
      <SfxSection {scene} />
    </div>
  </div>
</section>

<style>
  .scene {
    padding: 1rem 1.2rem 2rem;
  }
  .head {
    margin-bottom: 1rem;
  }
  .name {
    font-size: 1.2rem;
    font-weight: 600;
    flex: 0 1 22rem;
    min-width: 0;
  }
  /* Fade in and Fade out sit together after the name; delete hugs the right edge. */
  .actions {
    flex: 1 1 20rem;
    display: flex;
    gap: 0.6rem;
  }
  .delete {
    margin-left: auto;
  }
  .sections {
    display: grid;
    gap: 0.8rem;
  }
  .box {
    padding: 0.8rem 1rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--bg-2) 60%, transparent);
  }
  .stack {
    display: grid;
    gap: 0.6rem;
  }
  .stack :global(form.add) {
    margin-top: 0.2rem;
  }
  hr {
    margin: 0;
    border: none;
    border-top: 1px solid var(--line);
  }
</style>
