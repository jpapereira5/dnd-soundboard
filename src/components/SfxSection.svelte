<script lang="ts">
  import type { Scene } from '../lib/types'
  import { runtime, playSfx, addSfx, removeSfx, applySfxVolume } from '../lib/state.svelte'
  import { SFX_KEYS } from '../lib/hotkeys'
  import AddMediaForm from './AddMediaForm.svelte'

  let { scene }: { scene: Scene } = $props()
</script>

<section class="sfx">
  <h3>Efeitos</h3>

  <div class="grid">
    {#each scene.sfx as sfx, i (sfx.id)}
      {@const status = runtime.status[sfx.id] ?? 'idle'}
      <div class="card" class:playing={status === 'playing'}>
        <div class="body">
          <button class="fire primary" disabled={status === 'error'} onclick={() => playSfx(sfx)}>
            {#if SFX_KEYS[i]}<kbd>{SFX_KEYS[i].toUpperCase()}</kbd>{/if}
            <span class="label">{sfx.title || runtime.titles[sfx.id] || 'Efeito'}</span>
          </button>
          {#if status === 'error'}
            <div class="error">Erro: {runtime.errors[sfx.id]}</div>
          {/if}
          <div class="row">
            <input class="name" type="text" bind:value={sfx.title} placeholder="Nome" />
            <button class="icon danger" title="Remover efeito" onclick={() => removeSfx(scene.id, sfx.id)}>✕</button>
          </div>
          <label class="vol">
            <span class="muted">Vol</span>
            <input type="range" min="0" max="100" bind:value={sfx.volume} oninput={() => applySfxVolume(sfx)} />
            <span class="num">{sfx.volume}</span>
          </label>
        </div>
      </div>
    {/each}
  </div>

  <AddMediaForm actions={[{ label: 'Adicionar', onadd: (ytId, _kind, title) => addSfx(scene.id, ytId, title) }]} />
</section>

<style>
  h3 {
    margin: 0 0 0.6rem;
    font-size: 1rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.8rem;
  }
  .card.playing {
    border-color: var(--accent);
  }
  .body {
    padding: 0.6rem 0.7rem 0.7rem;
    display: grid;
    gap: 0.5rem;
    min-width: 0;
  }
  .body > * {
    min-width: 0;
  }
  .fire {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem;
    font-weight: 600;
  }
  .fire .label {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name {
    flex: 1;
    min-width: 0;
  }
  .error {
    color: #ffb3ad;
    font-size: 0.85rem;
  }
  .vol {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .num {
    width: 2.2em;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .sfx :global(form.add) {
    margin-top: 0.6rem;
  }
</style>
