<script lang="ts">
  import type { Group, Scene } from '../lib/types'
  import { GROUPS } from '../lib/types'
  import { addTrack, moveTrackTo } from '../lib/state.svelte'
  import TrackCard from './TrackCard.svelte'
  import AddMediaForm from './AddMediaForm.svelte'

  let { scene, group }: { scene: Scene; group: Group } = $props()

  const meta = $derived(GROUPS.find((g) => g.id === group)!)
  const tracks = $derived(scene.tracks.filter((t) => t.group === group))
  /** Music and battle hold one track each, on one line; ambience can layer several. */
  const single = $derived(group !== 'ambience')
  const canAdd = $derived(!single || tracks.length === 0)

  // Ambience tracks reorder by dragging the grip at their left edge. The
  // first one is the one a scene start plays. Players live outside these
  // cards (see Players.svelte), so moving a card never touches playback.
  let dragId = $state<string | null>(null)
  let dropIndex = $state<number | null>(null)

  function onDragStart(e: DragEvent, id: string) {
    dragId = id
    e.dataTransfer?.setData('text/plain', id)
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: DragEvent, index: number) {
    if (dragId === null) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    dropIndex = e.clientY > rect.top + rect.height / 2 ? index + 1 : index
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    if (dragId !== null && dropIndex !== null) {
      const from = tracks.findIndex((t) => t.id === dragId)
      moveTrackTo(scene.id, dragId, dropIndex > from ? dropIndex - 1 : dropIndex)
    }
    onDragEnd()
  }

  function onDragEnd() {
    dragId = null
    dropIndex = null
  }

  function onDragLeave(e: DragEvent) {
    const next = e.relatedTarget as Node | null
    if (!next || !(e.currentTarget as HTMLElement).contains(next)) dropIndex = null
  }
</script>

<div class="group" class:single>
  <h3>{meta.label}</h3>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="body" ondrop={onDrop} ondragleave={onDragLeave}>
    {#each tracks as track, i (track.id)}
      <div
        class="item"
        class:dragging={dragId === track.id}
        class:drop-before={dropIndex === i}
        class:drop-after={dropIndex === i + 1 && i === tracks.length - 1}
        ondragover={(e) => onDragOver(e, i)}
      >
        {#if !single}
          <span
            class="grip"
            draggable="true"
            title="Arrastar para reordenar. A primeira é a que arranca com a cena."
            ondragstart={(e) => onDragStart(e, track.id)}
            ondragend={onDragEnd}>⠿</span
          >
        {/if}
        <TrackCard {track} sceneId={scene.id} />
      </div>
    {/each}
    {#if canAdd}
      <AddMediaForm label="Adicionar" allowPlaylist onadd={(ytId, kind, title) => addTrack(scene.id, group, ytId, kind, title)} />
    {/if}
  </div>
</div>

<style>
  h3 {
    margin: 0 0 0.6rem;
    font-size: 1rem;
  }
  .body {
    display: grid;
    gap: 0.5rem;
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
  /* Insertion bar in the gap above or below the card. */
  .item.drop-before::before,
  .item.drop-after::after {
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
  .item.drop-after::after {
    bottom: calc(-0.25rem - 2px);
  }
  .group :global(form.add) {
    margin-top: 0.6rem;
  }

  /* Single-track groups: heading and the track on one line. */
  .single {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex-wrap: wrap;
  }
  .single h3 {
    margin: 0;
    flex: 0 0 5rem;
  }
  .single .body {
    flex: 1 1 24rem;
    min-width: 0;
  }
  .single :global(form.add) {
    margin-top: 0;
  }
</style>
