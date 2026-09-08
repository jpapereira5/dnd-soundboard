<script lang="ts">
  import { session, runtime, setMaster, setAmbienceMaster, stopAll, exportSession, importSession } from '../lib/state.svelte'
  import { currentLink } from '../lib/sync'

  let fileInput = $state<HTMLInputElement>()
  let copied = $state(false)

  async function copyLink() {
    const link = currentLink()
    try {
      await navigator.clipboard.writeText(link)
      copied = true
      setTimeout(() => (copied = false), 1500)
    } catch {
      prompt('Copia o link:', link)
    }
  }

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

  <button class:primary={runtime.showLink} title="Link que leva esta sessão para outro computador" onclick={() => (runtime.showLink = !runtime.showLink)}>
    Link
  </button>
  <button onclick={exportSession}>Exportar</button>
  <button onclick={() => fileInput?.click()}>Importar</button>
  <input type="file" accept="application/json" hidden bind:this={fileInput} onchange={onImport} />
  <button class:primary={runtime.showHelp} onclick={() => (runtime.showHelp = !runtime.showHelp)}>?</button>
</header>

{#if runtime.showLink}
  <aside class="help sync">
    <p>
      A sessão inteira vai dentro do link desta página, que se mantém sempre atualizado na barra de endereços. Copia-o para abrir a mesma sessão noutro
      computador: cenas, faixas, volumes, tudo. Não há conta nem serviço externo. Guarda-o nas notas da campanha ou nos favoritos, e copia de novo quando
      fizeres alterações.
    </p>
    <p class="row">
      <button class="primary" onclick={copyLink}>{copied ? 'Copiado ✓' : 'Copiar link'}</button>
      {#if runtime.link.loaded === 'newer'}
        <span class="muted small">Esta página abriu com um link mais recente do que a sessão que aqui estava: ficou a do link.</span>
      {:else if runtime.link.loaded === 'older'}
        <span class="muted small">O link com que abriste era mais antigo do que a sessão deste computador: ficou a daqui.</span>
      {/if}
    </p>
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
      <li>Tudo fica guardado neste browser e no link da página. O botão Link copia-o para abrires a mesma sessão noutro computador. Exportar e Importar continuam a funcionar.</li>
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
  .small {
    font-size: 0.85rem;
  }

</style>
