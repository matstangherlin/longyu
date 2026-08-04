# SEO — pacote mínimo (beta)

## Estado

Implementado o pacote mínimo de SEO técnico + páginas públicas de conteúdo.

## Domínio

Canônico atual: `https://longyu.netlify.app` (`VITE_SITE_URL`).

Quando existir domínio próprio (ex.: `longyu.com.br`):

1. Atualizar `VITE_SITE_URL` no Netlify / `netlify.toml`
2. Atualizar `Sitemap:` em `public/robots.txt` e URLs em `index.html` (ou regenerar build)
3. Incluir o domínio no widget Turnstile

## Artefatos

| Item | Onde |
|------|------|
| `robots.txt` | `public/robots.txt` |
| `sitemap.xml` | gerado no build (`scripts/seo-prerender.mjs`) |
| Open Graph / Twitter | `index.html` + `SeoHead` |
| JSON-LD (EducationalApplication) | `index.html` + `SeoHead` |
| Imagem social 1200×630 | `public/og-image.png` (`npm run generate:og-image`) |
| `noindex` rotas privadas | `src/lib/seo.ts` + `SeoHead` |
| Páginas públicas | `/aprender-mandarim`, `/curso-de-mandarim-online`, … |
| Prerender leve | HTML por rota em `dist/<path>/index.html` |

## Comandos

```bash
npm run generate:og-image
npm run validate:seo
npm run build          # inclui seo-prerender
npm run test:e2e -- e2e/seo.spec.ts
```

## Fora deste pacote

- Domínio próprio / DNS
- SSR completo
- Autoridade e backlinks
- Conteúdo editorial contínuo
