<script lang="ts">
  import type { Group, Scene } from '../lib/types'
  import { GROUPS } from '../lib/types'
  import { runtime, moveTrackTo, toggleGroup, groupPlaying } from '../lib/state.svelte'
  import TrackCard from './TrackCard.svelte'

  let { scene, group }: { scene: Scene; group: Group } = $props()

  const meta = $derived(GROUPS.find((g) => g.id === group)!)
  const tracks = $derived(scene.tracks.filter((t) => t.group === group))
  /** The heading is a toggle: off plays the group's first track, on fades the group out. */
  const on = $derived(groupPlaying(scene, group))

  // Any track can be dragged by its grip to another spot in its group or
  // into another group of the scene. The drag id is shared through runtime
  // so every section can be a drop target; the drop position is local.
  // Players live outside these cards (see Players.svelte), so moving a
  // card never touches playback.
  let dropIndex = $state<number | null>(null)
  const dropAt = $derived(runtime.dragTrackId ? dropIndex : null)

  function onDragStart(e: DragEvent, id: string) {
    runtime.dragTrackId = id
    e.dataTransfer?.setData('text/plain', id)
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: DragEvent) {
    if (!runtime.dragTrackId) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    const item = (e.target as HTMLElement).closest<HTMLElement>('.item')
    if (!item) {
      dropIndex = tracks.length
      return
    }
    const index = Number(item.dataset.index)
    const rect = item.getBoundingClientRect()
    dropIndex = e.clientY > rect.top + rect.height / 2 ? index + 1 : index
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    const id = runtime.dragTrackId
    if (id && dropIndex !== null) {
      const from = tracks.findIndex((t) => t.id === id)
      // Removing the dragged card from this list shifts the ones after it up.
      moveTrackTo(scene.id, id, group, from >= 0 && dropIndex > from ? dropIndex - 1 : dropIndex)
    }
    onDragEnd()
  }

  function onDragEnd() {
    runtime.dragTrackId = null
    dropIndex = null
  }

  function onDragLeave(e: DragEvent) {
    const next = e.relatedTarget as Node | null
    if (!next || !(e.currentTarget as HTMLElement).contains(next)) dropIndex = null
  }
</script>

<!-- Heading and tracks on one line; the whole row is a drop target, so an empty group can receive a track. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="group" ondragover={onDragOver} ondrop={onDrop} ondragleave={onDragLeave}>
  <button
    class="head"
    class:primary={on}
    disabled={tracks.length === 0}
    title={on
      ? `Fade out a ${meta.label.toLowerCase()}`
      : group === 'ambience'
        ? 'Tocar a primeira faixa de ambiente'
        : `Tocar ${meta.label.toLowerCase()}, com fade out ao resto`}
    onclick={() => toggleGroup(scene.id, group)}>{meta.label}</button
  >
  <div class="body" class:drop-end={dropAt === tracks.length}>
    {#each tracks as track, i (track.id)}
      <div class="item" data-index={i} class:dragging={runtime.dragTrackId === track.id} class:drop-before={dropAt === i}>
        <span
          class="grip"
          draggable="true"
          title="Arrastar para reordenar ou mover para outro grupo. A primeira de cada grupo é a que arranca."
          ondragstart={(e) => onDragStart(e, track.id)}
          ondragend={onDragEnd}>⠿</span
        >
        <TrackCard {track} sceneId={scene.id} />
      </div>
    {/each}
  </div>
</div>

<style>
  .group {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex-wrap: wrap;
  }
  .head {
    flex: 0 0 6rem;
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    text-align: center;
  }
  .body {
    position: relative;
    flex: 1 1 24rem;
    min-width: 0;
    display: grid;
    gap: 0.5rem;
    /* Room for the insertion bar and for drops into an empty group. */
    min-height: 1.5rem;
  }
  .item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .item > :global(.track) {
    flex: 1;
    min-width: 0;
  }
  .grip {
    cursor: grab;
    color: var(--muted);
    user-select: none;
    padding: 0.2rem 0.1rem;
    font-size: 1.1rem;
    line-height: 1;
  }
  .grip:active {
    cursor: grabbing;
  }
  .item.dragging {
    opacity: 0.4;
  }
  /* Insertion bar: above the card it lands before, or at the end of the list. */
  .item.drop-before::before,
  .body.drop-end::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 3px;
    border-radius: 2px;
    background: var(--accent);
    pointer-events: none;
  }
  .item.drop-before::before {
    top: calc(-0.25rem - 2px);
  }
  .body.drop-end::after {
    bottom: -0.35rem;
  }
</style>
