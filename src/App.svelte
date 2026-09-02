<script lang="ts">
  import { session, runtime, activateScene, stopAll, playSfx, primeAll } from './lib/state.svelte'
  import { SCENE_KEYS, SFX_KEYS, isTypingTarget } from './lib/hotkeys'
  import Header from './components/Header.svelte'
  import SceneTabs from './components/SceneTabs.svelte'
  import ScenePanel from './components/ScenePanel.svelte'
  import Players from './components/Players.svelte'

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
    // Effect keys follow the scene on screen, where their labels are.
    const sfxIndex = SFX_KEYS.indexOf(key)
    const viewed = session.scenes.find((s) => s.id === runtime.viewSceneId)
    if (sfxIndex >= 0 && viewed?.sfx[sfxIndex]) {
      playSfx(viewed.sfx[sfxIndex])
      e.preventDefault()
    }
  }
</script>

<svelte:window onkeydown={onKeydown} onpointerdowncapture={primeAll} onkeydowncapture={primeAll} />

<Header />
<SceneTabs />
<!-- All YouTube players, in a fixed DOM order. See Players.svelte. -->
<Players />

<main>
  {#each session.scenes as scene (scene.id)}
    <!-- Every scene stays mounted so switching the view never recreates its cards. -->
    <div hidden={runtime.viewSceneId !== scene.id}>
      <ScenePanel {scene} />
    </div>
  {/each}
  {#if session.scenes.length === 0}
    <p class="empty muted">Sem cenas. Cria uma com o botão "+ Cena".</p>
  {/if}
</main>

<style>
  .empty {
    padding: 2rem 1.2rem;
  }
</style>
