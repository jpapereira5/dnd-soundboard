<script lang="ts">
  import { session, runtime, setMaster, stopAll, exportSession, importSession } from '../lib/state.svelte'

  let fileInput = $state<HTMLInputElement>()

  async function onImport(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    try {
      await importSession(file)
    } catch (err) {
      alert(`Não consegui importar: ${err instanceof Error ? err.message : err}`)
    }
    input.value = ''
  }
</script>

<header class="row">
  <h1>🎲 Soundboard</h1>

  <label class="master">
    <span class="muted">Master</span>
    <input type="range" min="0" max="100" value={session.master} oninput={(e) => setMaster(Number(e.currentTarget.value))} />
    <span class="num">{session.master}</span>
  </label>

  <label class="crossfade">
    <span class="muted">Crossfade</span>
    <input type="number" min="0" step="500" bind:value={session.crossfadeMs} />
    <span class="muted">ms</span>
  </label>

  <span class="grow"></span>

  <button class="danger" onclick={() => stopAll()}>■ Parar tudo <kbd>Esc</kbd></button>
  <button onclick={exportSession}>Exportar</button>
  <button onclick={() => fileInput?.click()}>Importar</button>
  <input type="file" accept="application/json" hidden bind:this={fileInput} onchange={onImport} />
  <button class:primary={runtime.showHelp} onclick={() => (runtime.showHelp = !runtime.showHelp)}>?</button>
</header>

{#if runtime.showHelp}
  <aside class="help">
    <ul>
      <li><kbd>1</kbd>–<kbd>9</kbd> ativam a cena com crossfade. Clique numa cena só a mostra, duplo clique ativa.</li>
      <li><kbd>Q</kbd>–<kbd>P</kbd>, <kbd>A</kbd>–<kbd>L</kbd>, <kbd>Z</kbd>–<kbd>M</kbd> disparam efeitos pela ordem em que estão.</li>
      <li><kbd>Esc</kbd> ou <kbd>0</kbd> fazem fade out a tudo.</li>
      <li>O browser só deixa tocar som depois de um clique na página. Se uma cena não arrancar, clica em qualquer lado e tenta de novo.</li>
      <li>As tracks de uma cena só carregam quando a abres pela primeira vez. Abre as cenas da sessão antes de começar para o crossfade ser imediato.</li>
      <li>Tudo fica guardado neste browser. Usa Exportar para levar a sessão para outro computador.</li>
    </ul>
  </aside>
{/if}

<style>
  header {
    padding: 0.7rem 1.2rem;
    border-bottom: 1px solid var(--line);
    background: var(--bg-2);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  h1 {
    font-size: 1.2rem;
    margin: 0 0.6rem 0 0;
  }
  .master,
  .crossfade {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .master input[type='range'] {
    width: 10rem;
  }
  .crossfade input {
    width: 5.5em;
    padding: 0.2rem 0.4rem;
  }
  .num {
    width: 2.2em;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .grow {
    flex: 1;
  }
  .help {
    padding: 0.5rem 1.2rem;
    background: var(--bg-3);
    border-bottom: 1px solid var(--line);
    font-size: 0.9rem;
  }
  .help ul {
    margin: 0.3rem 0;
    padding-left: 1.2rem;
  }
</style>
