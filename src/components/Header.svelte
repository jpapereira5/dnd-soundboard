<script lang="ts">
  import { session, runtime, setMaster, setAmbienceMaster, stopAll, exportSession, importSession, enableCloud, disableCloud, syncNow } from '../lib/state.svelte'

  let fileInput = $state<HTMLInputElement>()
  let copied = $state(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(runtime.sync.link)
      copied = true
      setTimeout(() => (copied = false), 1500)
    } catch {
      prompt('Copia o link:', runtime.sync.link)
    }
  }

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
      case 'on':
        return 'Nuvem ✓'
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
    {#if runtime.sync.link}
      <p>
        Esta sessão tem uma cópia na nuvem e cada alteração é guardada lá passados uns segundos. Para a abrires noutro computador, usa este link. Quem
        tiver o link pode ler e alterar a sessão.
      </p>
      <p class="row">
        <input class="link" type="text" readonly value={runtime.sync.link} onfocus={(e) => e.currentTarget.select()} />
        <button class="primary" onclick={copyLink}>{copied ? 'Copiado ✓' : 'Copiar link'}</button>
        <button onclick={syncNow}>Sincronizar agora</button>
        <button class="danger" onclick={disableCloud}>Desligar neste computador</button>
      </p>
      <p class="muted small">
        Guarda o link nos favoritos ou nas notas da campanha. A cópia na nuvem é apagada pelo serviço ao fim de 30 dias sem ser aberta; se isso acontecer, a app
        cria uma nova a partir deste computador e o link muda.
      </p>
    {:else}
      <p>
        A sessão está guardada só neste browser. Liga a nuvem para ter uma cópia partilhada, sem conta nem token: recebes um link que abre a mesma sessão
        em qualquer computador e guarda as alterações automaticamente. A cópia mais recente ganha.
      </p>
      <p class="row">
        <button class="primary" onclick={enableCloud} disabled={runtime.sync.status === 'saving'}>Ligar nuvem</button>
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
      <li>Tudo fica guardado neste browser. O botão Nuvem cria uma cópia partilhada com um link que abre a mesma sessão noutro computador. Exportar e Importar continuam a funcionar.</li>
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
  .sync .link {
    flex: 1 1 22rem;
    min-width: 0;
  }
  .small {
    font-size: 0.85rem;
  }
  .error {
    color: #ffb3ad;
  }

</style>
