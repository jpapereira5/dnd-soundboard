<script lang="ts">
  import type { Scene } from '../lib/types'
  import { runtime, activateScene, fadeOutScene, removeScene, addTrack, addSfx, pasteAsTrack, pasteAsSfx, clearClipboard, sceneState, sceneStopping } from '../lib/state.svelte'
  import type { Group } from '../lib/types'
  import TrackSection from './TrackSection.svelte'
  import SfxSection from './SfxSection.svelte'
  import AddMediaForm from './AddMediaForm.svelte'

  let { scene }: { scene: Scene } = $props()

  const active = $derived(runtime.activeSceneId === scene.id)
  /** What the scene's running tracks are doing, whichever way they were started. */
  const live = $derived(sceneState(scene))
  /** Something in this scene is sounding, so there is something to fade out. */
  const sounding = $derived(live !== null)
  /** A fade out is under way: the button shows it in red until it ends. */
  const stopping = $derived(sceneStopping(scene))
  /** Label of the start button while the scene is active: Loading, Fading in, then Playing. */
  const startState = $derived(active ? live : null)
  /** Loading in yellow until sound starts; Playing in green from the first note, fade in included. */
  const startLabel = $derived(startState === 'loading' ? '▶ Loading' : startState ? '▶ Playing' : '▶ Play')

  // One form for the whole scene, opened by the Adicionar button: paste a
  // link, then pick where it goes. It closes again after adding.
  let adding = $state(false)
  const adder = (label: string, group: Group) => ({
    label,
    onadd: (ytId: string, kind: 'video' | 'playlist', title: string) => {
      addTrack(scene.id, group, ytId, kind, title)
      adding = false
    },
  })
  const actions = [
    adder('+ Música', 'music'),
    adder('+ Batalha', 'battle'),
    adder('+ Ambiente', 'ambience'),
    {
      label: '+ Efeito',
      videoOnly: true,
      onadd: (ytId: string, _kind: 'video' | 'playlist', title: string) => {
        addSfx(scene.id, ytId, title)
        adding = false
      },
    },
  ]

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
      <!-- Idle: plain Play. Active: a filled Loading, then a green Playing. -->
      <button class:primary={startState === 'loading'} class:ok={startState === 'fading' || startState === 'playing'} onclick={() => activateScene(scene.id)}>{startLabel}</button>
      <!-- Grey while nothing sounds; red while a fade out runs. -->
      <button class="danger" class:on={stopping} disabled={!sounding && !stopping} onclick={() => fadeOutScene(scene.id)}>{stopping ? '■ Fading out' : '■ Stop'}</button>
      <button class="danger delete" onclick={remove}>Apagar cena</button>
    </div>
  </div>

  <div class="sections">
    <!-- Music and battle share a box: one plays or the other. -->
    <div class="box stack">
      <TrackSection {scene} group="music" />
      <hr />
      <TrackSection {scene} group="battle" />
    </div>
    <div class="box">
      <TrackSection {scene} group="ambience" />
    </div>
    <div class="box">
      <SfxSection {scene} />
    </div>
    {#if adding}
      <div class="box add-box">
        <h3>Adicionar</h3>
        <AddMediaForm allowPlaylist {actions} />
      </div>
    {/if}
    <div class="row">
      <button class:primary={adding} onclick={() => (adding = !adding)}>{adding ? 'Fechar' : '+ Adicionar'}</button>
      {#if runtime.clipboard}
        <span class="paste row">
          <span class="muted">Colar «{runtime.clipboard.title || runtime.clipboard.ytId}» em</span>
          <button onclick={() => pasteAsTrack(scene.id, 'music')}>Música</button>
          <button onclick={() => pasteAsTrack(scene.id, 'battle')}>Batalha</button>
          <button onclick={() => pasteAsTrack(scene.id, 'ambience')}>Ambiente</button>
          {#if runtime.clipboard.kind === 'video'}
            <button onclick={() => pasteAsSfx(scene.id)}>Efeitos</button>
          {/if}
          <button class="icon" title="Esquecer o que foi copiado" onclick={clearClipboard}>✕</button>
        </span>
      {/if}
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
  .paste {
    gap: 0.4rem;
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
  .add-box {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex-wrap: wrap;
  }
  .add-box h3 {
    margin: 0;
    font-size: 1rem;
    flex: 0 0 6rem;
    padding-left: 0.8rem;
  }
  .add-box :global(form.add) {
    flex: 1 1 24rem;
    margin-top: 0;
  }
  hr {
    margin: 0;
    border: none;
    border-top: 1px solid var(--line);
  }
</style>
