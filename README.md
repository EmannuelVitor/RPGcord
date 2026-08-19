# RPGcord — RPG dentro do Discord

Aplicativo leve de mesa virtual para web e Discord Activity. O frontend e as rotas de API usam Next.js; login Google/Discord, campanhas, convites, fichas, rolagens, cenas e pinos usam Firebase/Firestore em tempo real.

## O que já está implementado

- autenticação automática com o Discord Embedded App SDK;
- troca OAuth no servidor, sem expor o `DISCORD_CLIENT_SECRET`;
- criação de Firebase Custom Token após validar o usuário na API do Discord;
- papel de Mestre persistido no documento da sessão e protegido pelas regras do Firestore;
- ficha completa com atributos, perícias, vida, armadura e inventário;
- dados d4, d6, d8, d10, d12, d20 e d100 com modificador e log em tempo real;
- mapa com grade opcional, zoom e tokens arrastáveis por mouse ou toque;
- painel do Mestre para ativar mapa, criar monstros e revelar imagens do Google Drive;
- layout responsivo para o iframe do Discord;
- modo local de demonstração, útil antes de configurar serviços externos.

## 1. Configuração local

Requer Node.js 20 ou superior.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Sem variáveis, abra `http://localhost:3000` para usar o modo de demonstração.

## 2. Firebase

1. Crie um projeto gratuito no [Firebase Console](https://console.firebase.google.com/).
2. Ative **Authentication** e o **Cloud Firestore**. O login do cliente será feito por Custom Token, portanto não é necessário habilitar um provedor social.
3. Crie um aplicativo Web e copie a configuração pública para as variáveis `NEXT_PUBLIC_FIREBASE_*`.
4. Em **Configurações do projeto → Contas de serviço**, gere uma chave privada e preencha `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` somente no servidor/Vercel.
5. Instale a Firebase CLI e publique as regras:

```bash
firebase login
firebase use SEU_PROJECT_ID
firebase deploy --only firestore:rules
```

As coleções são criadas automaticamente neste formato:

```text
sessions/{channelId}
  gmId
  characters/{discordUserId}
  dicerolls/{rollId}
  tokens/{tokenId}
  scenes/active
```

Defina `NEXT_PUBLIC_GM_DISCORD_ID` com o ID do Mestre. Ele deve abrir a Activity uma vez para criar o documento da sessão; depois disso, o `gmId` salvo no Firestore é a fonte de permissão.

## 3. Discord Activity

1. Crie uma aplicação no [Discord Developer Portal](https://discord.com/developers/applications).
2. Em **OAuth2**, adicione `https://127.0.0.1` como Redirect URI da Activity.
3. Copie o Application ID para `NEXT_PUBLIC_DISCORD_CLIENT_ID` e o Client Secret para `DISCORD_CLIENT_SECRET`.
4. Em **Activities**, habilite a Activity e crie o URL Mapping `/` apontando para o domínio HTTPS publicado.
5. Para imagens do Drive, mantenha os arquivos como “qualquer pessoa com o link” e autorize nos mapeamentos de rede da Activity os hosts `drive.google.com` e `*.googleusercontent.com`.

O fluxo usado é `ready → authorize → /api/token → authenticate`. Em seguida, o access token do Discord é validado no servidor e convertido em Firebase Custom Token por `/api/firebase-token`.

## 4. Google Drive

O campo do painel do Mestre aceita tanto o link completo de compartilhamento quanto um link com `id=`. O utilitário em `lib/drive.ts` extrai o ID e converte para:

```text
https://drive.google.com/uc?export=view&id=ID_DO_ARQUIVO
```

## 5. Vercel

Importe o repositório na Vercel, mantenha o preset **Next.js** e cadastre todas as variáveis de `.env.example`. Não exponha `DISCORD_CLIENT_SECRET`, `FIREBASE_CLIENT_EMAIL` nem `FIREBASE_PRIVATE_KEY` com prefixo `NEXT_PUBLIC_`.

Depois do deploy, use a URL final no URL Mapping da Activity. O plano gratuito é suficiente para um grupo pequeno; o Firestore só mantém listeners das coleções da sessão atual e limita o log carregado às 30 rolagens mais recentes.

## Segurança

As regras em `firestore.rules` exigem Firebase Auth em todas as operações. Jogadores só alteram a própria ficha e os próprios pinos; apenas o Mestre altera cenas, monstros e a sessão. Não use regras globais `allow read, write: if true` em produção.
