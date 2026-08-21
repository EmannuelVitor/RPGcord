# RPGcord — sua mesa de RPG

Mesa virtual leve para web e Discord Activity. Frontend e rotas de API em Next.js
(App Router); campanhas, fichas, mapa com névoa de guerra, rolagens, chat, diário
e trilha sonora sincronizados em tempo real pelo Cloud Firestore.

Produção: <https://rpgcord.vercel.app>

## O que está implementado

**Campanhas e acesso**
- login Google na web e autenticação automática pelo Discord Embedded App SDK;
- troca OAuth no servidor, sem expor o `DISCORD_CLIENT_SECRET`, e Firebase Custom
  Token emitido só após conferir que o token veio deste aplicativo;
- hub de campanhas, convite por link ou código e lista de participantes com presença.

**Mesa**
- mapa com zoom, arraste, grade opcional e pinos por mouse ou toque;
- névoa de guerra com visão compartilhada ou individual, áreas reveladas pelo
  mestre e fontes de luz com raio intenso, raio difuso, cor e intensidade;
- pré-visualização ao vivo da luz enquanto ela é ajustada;
- assets de cenário em camadas, com posição, rotação, bloqueio, ocultação manual
  e integração opcional à névoa de guerra;
- pinos identificados como `Personagem (Jogador)`, com seletor de exibição;
- limite opcional de movimento para os jogadores;
- presença por cena: o Mestre pode ocultar temporariamente o mapa e o pino de
  um jogador sem removê-lo da campanha ou interromper chat, ficha e dados.

**Personagem e jogo**
- modelo de ficha editável pelo mestre, com campos de texto, número, status,
  contador, caixa de seleção e texto rico;
- registro extensível de sistemas, aplicação de modelos e importação/exportação
  de fichas estruturadas em JSON;
- catálogo privado de NPCs com fichas narrativas simplificadas;
- fichas de criaturas vinculadas ao combate, com nível, vida, atributos,
  fraquezas e habilidades revelados individualmente pelo Mestre;
- dados d4 a d100 com quantidade, modificador e modo de validação;
- chat da sessão com imagens e spoilers, sussurros privados em abas separadas,
  diário da campanha e bloco de notas por personagem;
- trilha do YouTube sincronizada para todo o grupo.

## 1. Ambiente local

Requer Node.js 20 ou superior e pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Sem as variáveis `NEXT_PUBLIC_FIREBASE_*` o aplicativo abre, mas o login informa
que o Firebase não está configurado. Não há modo de demonstração offline.

Scripts: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm test`.

> `pnpm build` e `pnpm dev` compartilham a pasta `.next`. Rodar o build com o
> servidor de desenvolvimento no ar corrompe os chunks dele; pare um antes do outro.

## 2. Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Ative o **Cloud Firestore**.
3. Em **Authentication → Sign-in method**, ative o provedor **Google** (o login da
   web usa `signInWithPopup`; o Discord entra por Custom Token).
4. Em **Authentication → Settings → Authorized domains**, inclua `localhost`, o
   domínio de produção e — se for testar login em previews da Vercel — a URL de
   cada preview. O Firebase não aceita curinga aqui.
5. Crie um aplicativo Web e copie a configuração para as variáveis `NEXT_PUBLIC_FIREBASE_*`.
6. Em **Configurações do projeto → Contas de serviço**, gere uma chave privada e
   preencha `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`
   apenas no servidor.
7. Publique regras e índices:

```bash
firebase login
firebase use SEU_PROJECT_ID
firebase deploy --only firestore
```

O índice composto de `whispers` é obrigatório: sem ele a consulta das conversas
privadas falha em tempo de execução.

### Coleções

```text
campaigns/{campaignId}
  name, description, ownerId, ownerName, memberIds[], inviteCode, sheetTemplate
  members/{userId}        nome, avatar, papel, presença
  characters/{userId}     ficha completa
  tokens/{tokenId}        pinos de heróis e criaturas
  monsterSheets/{tokenId} ficha completa da criatura, privada do Mestre
  assets/{assetId}        imagens posicionáveis e camadas do mapa
  npcs/{npcId}            catálogo privado de personagens não jogáveis
  scenes/active           mapa, névoa, luzes, limites e presença por cena
  dicerolls/{rollId}      histórico de rolagens
  chatMessages/{id}       chat geral da campanha
  whispers/{id}           conversas privadas, filtradas por participantIds
  journal/main            diário do mestre
  notes/{userId}          bloco de notas do jogador
  music/current           trilha compartilhada

campaignInvites/{codigo}  código de convite → campanha
```

O dono da campanha (`ownerId`) é o Mestre; o papel é resolvido pelo documento da
campanha, não por variável de ambiente.

O registro de fichas já aceita novos sistemas sem mudanças no editor. O modelo
`RPGcord Universal` acompanha o projeto; modelos oficiais adicionais devem ser
registrados somente após o fornecimento e a validação dos respectivos PDFs e
arquivos estruturados, evitando inventar campos ou regras do sistema.

## 3. Discord Activity

1. Crie uma aplicação no [Discord Developer Portal](https://discord.com/developers/applications).
2. Em **OAuth2**, adicione `https://127.0.0.1` como Redirect URI da Activity.
3. Copie o Application ID para `NEXT_PUBLIC_DISCORD_CLIENT_ID` e o Client Secret
   para `DISCORD_CLIENT_SECRET`.
4. Em **Activities**, habilite a Activity e crie o URL Mapping `/` apontando para
   o domínio HTTPS publicado.
5. Suba as artes de `public/brand/` conforme o
   [guia da identidade visual](public/brand/README.md).

O fluxo é `ready → authorize → /api/token → authenticate`, e então o access token
é validado em `/oauth2/@me` e convertido em Firebase Custom Token por
`/api/firebase-token`.

## 4. Imagens

Links do Google Drive colados no painel do mestre são convertidos para o proxy
interno `/api/drive-image?id=...` por `lib/drive.ts`. Imagens enviadas pelo chat e
retratos de personagem vão para a pasta indicada em `GOOGLE_DRIVE_CHAT_FOLDER_ID`,
usando a conta de serviço do Firebase ou, se preferir, uma conta OAuth própria.

## 5. Vercel

Importe o repositório, mantenha o preset **Next.js** e cadastre as variáveis de
`.env.example`. Marque-as também para o ambiente **Preview**, senão os deploys de
branch sobem sem configuração. Nunca prefixe `DISCORD_CLIENT_SECRET`,
`FIREBASE_CLIENT_EMAIL` ou `FIREBASE_PRIVATE_KEY` com `NEXT_PUBLIC_`.

## Segurança

As regras em `firestore.rules` exigem Firebase Auth em todas as operações.
Jogadores alteram apenas a própria ficha, os próprios pinos e as próprias notas;
apenas o Mestre altera cenas, criaturas, diário, trilha e o modelo de ficha.
Assets ocultos e fichas completas de criaturas não são entregues aos jogadores;
o pino público contém apenas os campos que o Mestre revelou. NPCs também são
legíveis somente pelo dono da campanha. Sussurros só são legíveis por quem
participa da conversa. As rotas de API têm
limite de requisições por IP, que é por instância e não substitui um limite
compartilhado. Não use regras globais `allow read, write: if true` em produção.
