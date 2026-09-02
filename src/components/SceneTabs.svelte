<script lang="ts">
  import { session, runtime, viewScene, activateScene, addScene, moveSceneTo } from '../lib/state.svelte'
  import { SCENE_KEYS } from '../lib/hotkeys'

  // Tabs reorder by drag and drop. `dragId` is the tab being dragged;
  // `dropIndex` is where it would land, shown as a bar before that tab
  // (or after the last one when it equals scenes.length).
  let dragId = $state<string | null>(null)
  let dropIndex = $state<number | null>(null)

  function onDragStart(e: DragEvent, id: string) {
    dragId = id
    // Firefox only starts a drag when some data is set.
    e.dataTransfer?.setData('text/plain', id)
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: DragEvent, index: number) {
    if (dragId === null) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const after = e.clientX > rect.left + rect.width / 2
    dropIndex = after ? index + 1 : index
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    if (dragId !== null && dropIndex !== null) {
      const from = session.scenes.findIndex((s) => s.id === dragId)
      // Removing the dragged tab shifts everything after it one slot left.
      const target = dropIndex > from ? dropIndex - 1 : dropIndex
      moveSceneTo(dragId, target)
    }
    onDragEnd()
  }

  function onDragEnd() {
    dragId = null
    dropIndex = null
  }

  function onDragLeave(e: DragEvent) {
    // Only clear when leaving the tab strip, not when moving between tabs.
    const next = e.relatedTarget as Node | null
    if (!next || !(e.currentTarget as HTMLElement).contains(next)) dropIndex = null
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<nav class="tabs" ondragleave={onDragLeave} ondrop={onDrop}>
  {#each session.scenes as scene, i (scene.id)}
    <button
      class="tab"
      class:viewing={runtime.viewSceneId === scene.id}
      class:active={runtime.activeSceneId === scene.id}
      class:dragging={dragId === scene.id}
      class:drop-before={dropIndex === i}
      class:drop-after={dropIndex === i + 1 && i === session.scenes.length - 1}
      title="Clique: ver. Duplo clique ou tecla: ativar. Arrastar: reordenar."
      draggable="true"
      onclick={() => viewScene(scene.id)}
      ondblclick={() => activateScene(scene.id)}
      ondragstart={(e) => onDragStart(e, scene.id)}
      ondragover={(e) => onDragOver(e, i)}
      ondragend={onDragEnd}
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
    position: relative;
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
  .tab.dragging {
    opacity: 0.4;
  }
  /* Insertion bar in the gap next to the tab. */
  .tab.drop-before::before,
  .tab.drop-after::after {
    content: '';
    position: absolute;
    top: 0.2rem;
    bottom: 0.2rem;
    width: 3px;
    border-radius: 2px;
    background: var(--accent);
    pointer-events: none;
  }
  .tab.drop-before::before {
    left: calc(-0.2rem - 2px);
  }
  .tab.drop-after::after {
    right: calc(-0.2rem - 2px);
  }
  .new {
    color: var(--muted);
  }
</style>
