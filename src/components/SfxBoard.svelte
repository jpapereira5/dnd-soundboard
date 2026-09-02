<script lang="ts">
  import { session, runtime, playSfx, addSfx, removeSfx, applySfxVolume } from '../lib/state.svelte'
  import { SFX_KEYS } from '../lib/hotkeys'
  import PlayerHost from './PlayerHost.svelte'
  import AddMediaForm from './AddMediaForm.svelte'
</script>

<section class="sfx">
  <h2>Efeitos</h2>
  {#if session.sfx.length === 0}
    <p class="muted">Sons curtos disparados por botão ou tecla: trovão, porta, moedas...</p>
  {/if}

  <div class="grid">
    {#each session.sfx as sfx, i (sfx.id)}
      {@const status = runtime.status[sfx.id] ?? 'idle'}
      <div class="card" class:playing={status === 'playing'}>
        <PlayerHost id={sfx.id} options={{ ytId: sfx.ytId, kind: 'video', loop: false, shuffle: false, volume: sfx.volume }} />
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
            <button class="icon danger" title="Remover efeito" onclick={() => removeSfx(sfx.id)}>✕</button>
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

  <AddMediaForm label="Adicionar efeito" onadd={(ytId, _kind, title) => addSfx(ytId, title)} />
</section>

<style>
  .sfx {
    padding: 1rem 1.2rem 2rem;
    border-top: 1px solid var(--line);
    margin-top: 1rem;
  }
  h2 {
    font-size: 1.1rem;
    margin: 0 0 0.6rem;
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
</style>
