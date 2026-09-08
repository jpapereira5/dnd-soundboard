<script lang="ts">
  import { session, runtime, setMaster, setAmbienceMaster, stopAll, exportSession, importSession, saveToken, clearToken, syncNow } from '../lib/state.svelte'
  import { SYNC_HELP_URL } from '../lib/sync'

  let fileInput = $state<HTMLInputElement>()
  let tokenInput = $state('')

  const syncLabel = $derived.by(() => {
    const s = runtime.sync
    const time = s.at ? new Date(s.at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : ''
    switch (s.status) {
      case 'pulling':
        return 'Nuvem: a ler…'
      case 'saving':
        return 'Nuvem: a guardar…'
      case 'saved':
        return `Nuvem ✓ ${time}`
      case 'error':
        return 'Nuvem: erro'
      case 'readonly':
        return 'Nuvem: só leitura'
      default:
        return 'Nuvem'
    }
  })

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

  <label class="master" title="Só as faixas de ambiente, por cima do master">
    <span class="muted">Ambiente</span>
    <input type="range" min="0" max="100" value={session.ambienceMaster} oninput={(e) => setAmbienceMaster(Number(e.currentTarget.value))} />
    <span class="num">{session.ambienceMaster}</span>
  </label>

  <button class="danger" onclick={() => stopAll()}>■ Parar tudo <kbd>Esc</kbd></button>

  <span class="grow"></span>

  <button class:primary={runtime.showSync} class:danger={runtime.sync.status === 'error'} title="Guardar a sessão na nuvem" onclick={() => (runtime.showSync = !runtime.showSync)}>
    {syncLabel}
  </button>
  <button onclick={exportSession}>Exportar</button>
  <button onclick={() => fileInput?.click()}>Importar</button>
  <input type="file" accept="application/json" hidden bind:this={fileInput} onchange={onImport} />
  <button class:primary={runtime.showHelp} onclick={() => (runtime.showHelp = !runtime.showHelp)}>?</button>
</header>

{#if runtime.showSync}
  <aside class="help sync">
    <p>
      A sessão fica guardada no GitHub, no ficheiro <code>session.json</code> do ramo <code>data</code> deste repositório. Qualquer computador que abra
      esta página lê essa cópia. Para este computador também <strong>escrever</strong> as alterações, cola aqui um token do GitHub. A cópia mais recente
      ganha.
    </p>
    {#if runtime.sync.hasToken}
      <p class="row">
        <span>Este computador guarda na nuvem.</span>
        <button onclick={syncNow}>Sincronizar agora</button>
        <button class="danger" onclick={clearToken}>Remover token</button>
      </p>
    {:else}
      <form class="row" onsubmit={(e) => { e.preventDefault(); saveToken(tokenInput); tokenInput = '' }}>
        <input class="token" type="password" bind:value={tokenInput} placeholder="github_pat_…" autocomplete="off" />
        <button type="submit" class="primary" disabled={!tokenInput.trim()}>Guardar token</button>
      </form>
      <p class="muted small">
        Cria o token em <a href={SYNC_HELP_URL} target="_blank" rel="noreferrer">github.com → Settings → Developer settings → Fine-grained tokens</a>:
        Repository access "Only select repositories" → dnd-soundboard; Permissions → Contents: Read and write. O token fica só neste browser.
      </p>
    {/if}
    {#if runtime.sync.message}
      <p class="error">{runtime.sync.message}</p>
    {/if}
  </aside>
{/if}

{#if runtime.showHelp}
  <aside class="help">
    <ul>
      <li><kbd>1</kbd>–<kbd>9</kbd> fazem fade in à cena e fade out ao que estava a tocar. Clique numa cena só a mostra, duplo clique faz fade in.</li>
      <li>Cada cena tem Música, Batalha, Ambiente e Efeitos. Fade in numa cena toca a primeira faixa de Música e a primeira de Ambiente. Música e Batalha alternam: tocar uma faz fade out à outra. Arrasta a pega ⠿ de uma faixa para a reordenar ou mover para outro grupo; a primeira de cada grupo é a principal.</li>
      <li>Todos os fades duram 6 segundos.</li>
      <li><kbd>Q</kbd>–<kbd>P</kbd>, <kbd>A</kbd>–<kbd>L</kbd>, <kbd>Z</kbd>–<kbd>M</kbd> disparam os efeitos da cena que está no ecrã, pela ordem em que estão.</li>
      <li><kbd>Esc</kbd> ou <kbd>0</kbd> fazem fade out a tudo.</li>
      <li>O browser só deixa tocar som depois de um clique na página. Se uma cena não arrancar, clica em qualquer lado e tenta de novo.</li>
      <li>Todas as tracks carregam ao abrir a página e ficam pré-carregadas em silêncio, prontas a arrancar sem atraso.</li>
      <li>Círculo à esquerda de cada track: laranja intermitente a carregar, laranja fixo armada, pronta ou em fade out, verde a tocar ou em fade in, vermelho erro.</li>
      <li>Tudo fica guardado neste browser e, com um token no botão Nuvem, também no GitHub, para abrires noutro computador. Exportar e Importar continuam a funcionar.</li>
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
  .master {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .master input[type='range'] {
    width: 10rem;
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
  .sync p {
    margin: 0.4rem 0;
  }
  .sync .token {
    flex: 1 1 22rem;
  }
  .small {
    font-size: 0.85rem;
  }
  .error {
    color: #ffb3ad;
  }
  code {
    background: var(--bg);
    padding: 0 0.3em;
    border-radius: 4px;
  }
</style>
