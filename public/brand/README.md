# Identidade visual do RPGcord

A marca é um **selo losangular** (a mesma forma que a barra lateral já usava) com um
**d20 visto de frente** e uma faísca dourada. Todos os arquivos abaixo saem da mesma
fonte vetorial e da paleta já definida em `app/globals.css`.

## Paleta

| Papel | Cor |
| --- | --- |
| Violeta profundo (fundo de arte) | `#2b2245` |
| Violeta da barra lateral | `#45376d` |
| Violeta primário | `#7259c7` |
| Violeta claro | `#8b73d8` |
| Lilás de destaque | `#a987e5` |
| Névoa (traço do dado) | `#eadcff` |
| Dourado (faísca) | `#f0d9a6` |
| Tinta (texto) | `#2d2840` |

Tipografia: **Georgia** (serifada) na assinatura `RPGcord`, **Inter** na linha de apoio.
Assinatura de apoio das artes: `MESA DE RPG AO VIVO`.

## Arquivos

| Arquivo | Para quê |
| --- | --- |
| `mark.svg` | Selo isolado, fundo transparente. |
| `logo.svg` | Selo + assinatura, para fundos claros. |
| `logo-dark.svg` | Selo + assinatura, para fundos escuros. |
| `app-icon.svg` | Ícone quadrado, fundo cheio. |
| `icon-192.png`, `icon-512.png` | Ícones do manifest / PWA. |
| `discord-app-icon-1024.png` | **App Icon** no Discord Developer Portal. |
| `discord-activity-cover-1024x576.png` | Arte de vitrine da Activity (16:9). |
| `discord-activity-cover-1920x1080.png` | Mesma arte em alta resolução. |

Fora desta pasta, seguindo as convenções de arquivo do Next.js:

| Arquivo | Para quê |
| --- | --- |
| `app/icon.svg` | Favicon (silhueta sólida, legível a 16 px). |
| `app/apple-icon.png` | Ícone de atalho no iOS (180×180). |
| `app/opengraph-image.png` | **Prévia do link no Discord**, WhatsApp e buscadores (1200×630). |
| `app/twitter-image.png` | Mesma arte para o card do X/Twitter. |
| `components/BrandMark.tsx` | O selo inline, usado na barra lateral, no hub e no login. |

## Onde subir cada arte no Discord

1. **Developer Portal → General Information → App Icon**: `discord-app-icon-1024.png`.
2. **Developer Portal → Activities → Art Assets**: as artes `discord-activity-cover-*`.
3. **Prévia de link no chat**: nada a subir — o Discord lê `app/opengraph-image.png`
   pelas metatags Open Graph assim que o domínio for publicado.
