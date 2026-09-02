<script lang="ts">
  import { session, runtime, activateScene, stopAll, playSfx } from './lib/state.svelte'
  import { SCENE_KEYS, SFX_KEYS, isTypingTarget } from './lib/hotkeys'
  import Header from './components/Header.svelte'
  import SceneTabs from './components/SceneTabs.svelte'
  import ScenePanel from './components/ScenePanel.svelte'
  import SfxBoard from './components/SfxBoard.svelte'

  // Panels keep a fixed DOM order whatever the tab order. Only one is
  // visible at a time, and moving a panel would move its YouTube iframes,
  // which the browser reloads, killing whatever that scene was playing.
  const panels = $derived([...session.scenes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)))

  function onKeydown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return
    const key = e.key.toLowerCase()

    if (key === 'escape' || key === '0') {
      stopAll()
      e.preventDefault()
      return
    }
    const sceneIndex = SCENE_KEYS.indexOf(key)
    if (sceneIndex >= 0 && session.scenes[sceneIndex]) {
      activateScene(session.scenes[sceneIndex].id)
      e.preventDefault()
      return
    }
    const sfxIndex = SFX_KEYS.indexOf(key)
    if (sfxIndex >= 0 && session.sfx[sfxIndex]) {
      playSfx(session.sfx[sfxIndex])
      e.preventDefault()
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<Header />
<SceneTabs />

<main>
  {#each panels as scene (scene.id)}
    <!-- Every scene stays mounted so crossfades between scenes keep both sets of players alive. -->
    <div hidden={runtime.viewSceneId !== scene.id}>
      <ScenePanel {scene} />
    </div>
  {/each}
  {#if session.scenes.length === 0}
    <p class="empty muted">Sem cenas. Cria uma com o botão "+ Cena".</p>
  {/if}
</main>

<SfxBoard />

<style>
  .empty {
    padding: 2rem 1.2rem;
  }
</style>
