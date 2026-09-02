# D&D Soundboard

Mesa de som para sessões de D&D que corre inteiramente no browser. Toca vários vídeos ou playlists do YouTube ao mesmo tempo, cada um com volume próprio, fade in/out e loop.

## Funcionalidades

- **Cenas**: grupos de tracks (Taberna, Combate, Floresta...). Ativar uma cena faz crossfade a partir da anterior.
- **Tracks**: vídeo ou playlist do YouTube. Volume independente, loop, shuffle em playlists, tempo de fade por track.
- **Efeitos (SFX)**: sons curtos disparados por botão ou tecla, sem loop.
- **Atalhos**: `1`–`9` ativam cenas, `Q`–`P`, `A`–`L`, `Z`–`M` disparam efeitos, `Esc` faz fade out a tudo, `V` esconde ou mostra o vídeo.
- **Persistência** em `localStorage`, com exportação e importação em JSON.

## Limitações conhecidas

- Só funciona com o leitor oficial do YouTube (IFrame API). Não há acesso ao áudio bruto, logo não há equalizador.
- Vídeos monetizados podem mostrar anúncios. YouTube Premium na conta do browser resolve.
- Os termos do YouTube exigem que o leitor seja visível, por isso cada track mostra o vídeo por omissão. A tecla `V` colapsa os leitores mantendo o som. É opt-in e fica por tua conta.
- O browser só deixa tocar som depois de um clique na página.
- Loop de um único vídeo tem um pequeno silêncio ao reiniciar. Playlists em loop não têm esse problema.
- Pensado para desktop. Browsers móveis bloqueiam vários leitores em simultâneo.

## Desenvolvimento

```bash
npm install
npm run dev
```

`npm run build` gera a pasta `dist`. O workflow em `.github/workflows/deploy.yml` publica no GitHub Pages a cada push para `main`.
