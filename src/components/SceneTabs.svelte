<script lang="ts">
  import { session, runtime, viewScene, activateScene, addScene } from '../lib/state.svelte'
  import { SCENE_KEYS } from '../lib/hotkeys'
</script>

<nav class="tabs">
  {#each session.scenes as scene, i (scene.id)}
    <button
      class="tab"
      class:viewing={runtime.viewSceneId === scene.id}
      class:active={runtime.activeSceneId === scene.id}
      title="Clique: ver. Duplo clique ou tecla: ativar."
      onclick={() => viewScene(scene.id)}
      ondblclick={() => activateScene(scene.id)}
    >
      {#if SCENE_KEYS[i]}<kbd>{SCENE_KEYS[i]}</kbd>{/if}
      <span class="label">{scene.name}</span>
      {#if runtime.activeSceneId === scene.id}<span class="status-dot playing"></span>{/if}
    </button>
  {/each}
  <button class="tab new" onclick={() => addScene()}>+ Cena</button>
</nav>

<style>
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    padding: 0.8rem 1.2rem 0;
    border-bottom: 1px solid var(--line);
  }
  .tab {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: 8px 8px 0 0;
    border-bottom: none;
    background: var(--bg-2);
    margin-bottom: -1px;
  }
  .tab.viewing {
    background: var(--bg-3);
    border-color: var(--accent-2);
    color: var(--accent);
  }
  .tab.active .label {
    font-weight: 600;
  }
  .new {
    color: var(--muted);
  }
</style>
