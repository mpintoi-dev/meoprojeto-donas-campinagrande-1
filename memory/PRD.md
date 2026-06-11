# PRD — Site Estático IDECAN

## Problem Statement (original)
"boa noite. eu quero montar pronjeto, onde eu mande a voce um arquivo html, e voce adicione esse aqruivo estatico meu site."
"ao inves de voce criar um site do zero, voce vai adicionar esse arquivo que vou mandar para voce. adicione ele, remova os links externos e vamos ser feliz"

## Visão geral
Hospedar como site o arquivo HTML enviado pelo usuário (página completa salva via SingleFile do site idecan.org.br, ~52 MB com imagens em base64), removendo todos os links externos.

## Arquitetura
- Frontend React (CRA) na porta 3000.
- O HTML do usuário fica em `/app/frontend/public/idecan.html` (servido como estático pelo dev server).
- `App.js` renderiza um `<iframe>` em tela cheia apontando para `/idecan.html`, de forma que a URL principal `/` exibe o site.
- Backend FastAPI permanece intocado (sem uso para este caso).

## Implementado nesta sessão (11/06/2026)
- Limpeza do HTML via `/app/scripts/clean_html.py`:
  - Removidos `<link>` tags externos (gmpg.org, idecan.org.br feeds/wp-json/xmlrpc/oembed, w.org).
  - Todos `href` apontando para `http(s)://...` foram convertidos para `href="#"`.
  - `src` e `action` externos também neutralizados.
- Arquivo limpo salvo em `/app/frontend/public/idecan.html`.
- `/app/frontend/src/App.js` simplificado para renderizar iframe fullscreen do HTML.
- `/app/frontend/src/App.css` ajustado para remover margens/scroll (iframe 100vw x 100vh).
- Verificação visual via screenshot — página IDECAN sendo renderizada normalmente.

## Backlog / Próximos passos sugeridos
- P1: Painel admin para upload de novos arquivos HTML (caso queira trocar a página facilmente sem mexer no código).
- P2: Página de listagem caso queira hospedar várias páginas HTML simultaneamente.
- P2: Build de produção (`yarn build`) — confirmar que o arquivo de 52 MB é copiado corretamente.
- P3: Otimizar tamanho (extrair imagens base64 para arquivos separados, lazy-loading) para acelerar carregamento.

## Como trocar o HTML no futuro
1. Substituir o arquivo `/app/frontend/public/idecan.html` pelo novo HTML (limpo).
2. Opcional: rodar `python3 /app/scripts/clean_html.py` (ajustando `SRC`/`DST`) para remover links externos automaticamente.
