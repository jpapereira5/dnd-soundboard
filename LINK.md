# Onde está a sessão mais recente

A sessão do soundboard (cenas, faixas, volumes) viaja dentro do link da
página, depois do `#s=`. Não há servidor: o link é a cópia.

## Sincronização pela Drive, ligada

- Ao abrir a página, a app lê a última linha da folha
  [D&D Soundboard — sessões](https://docs.google.com/spreadsheets/d/1JG6Q-6JVjn8sPOhBXaey65-3i4c04o_0VmXwkaJuw2U/edit)
  (`cotn_2026/musica`) e adota essa sessão se for mais recente do que a local.
- Cinco segundos depois de cada alteração, a app envia o link novo para o
  Google Form ligado a essa folha. O form aceita envios anónimos, por isso a
  página não precisa de token nem de login.
- Resultado: qualquer computador que abra a página fica com a versão mais
  recente, sem copiar nada. Em caso de conflito, a cópia mais recente ganha.

A configuração (form, pergunta, folha, separador) está em `src/lib/publish.ts`.
O documento [D&D Soundboard — link](https://docs.google.com/document/d/1AyQhU0OXWWjBTwN-AGKk7QQfq3nz5YRilZxjGcpY3HA/edit)
na mesma pasta explica o mesmo para quem não lê código.
