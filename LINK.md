# Onde está a sessão mais recente

A sessão do soundboard (cenas, faixas, volumes) viaja dentro do link da
página, depois do `#s=`. Não há servidor: o link é a cópia.

## Referência no Drive

Documento: [D&D Soundboard — link](https://docs.google.com/document/d/1AyQhU0OXWWjBTwN-AGKk7QQfq3nz5YRilZxjGcpY3HA/edit),
em `cotn_2026/musica`.

## Último link gravado aqui

_Nenhum ainda. Cola um link neste ficheiro, ou pede para o atualizar, sempre
que quiseres uma cópia no repositório._

## Envio automático

Com um Google Form configurado em `src/lib/publish.ts` (URL de envio e
`entry.<n>` da pergunta), a app envia o link para a folha de respostas do
form cinco segundos depois de cada alteração. A última linha dessa folha é
sempre a versão mais recente. O form aceita envios anónimos, por isso a
página não precisa de token.
