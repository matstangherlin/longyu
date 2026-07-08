# Longyu

Longyu é um app para brasileiros estudarem mandarim com foco em som, pinyin, tons, hànzì, prática e revisão.

**Modo padrão:** progresso local no navegador (`localStorage`).

**Com Supabase configurado** (`VITE_BACKEND_MODE=supabase`): conta com email/senha, sessão persistente, sincronização automática do progresso na nuvem e base para assinatura Pro via Stripe (Edge Functions já publicadas; secrets do Stripe são o próximo passo).

## Requisitos

- Node.js 20
- npm

## Como rodar

```bash
npm install
npm run dev
```

Abra o endereço indicado pelo Vite, normalmente `http://localhost:5173`.

### Backend Supabase (opcional)

```bash
npm run setup:supabase -- --init-env
# Edite .env.local: VITE_BACKEND_MODE=supabase, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run configure:supabase-auth
npm run dev
```

Conta → criar conta com email. O progresso sincroniza automaticamente — não há botão manual de sync.

Checklist completo: [`docs/DEPLOY_CHECKLIST.md`](docs/DEPLOY_CHECKLIST.md).

## Como validar

```bash
npm run typecheck
npm run validate:encoding
npm run validate:corpus
npm run validate:atlas
npm run validate:pinyin-display
npm run validate:lessons
npm run build
```

O build estático é gerado em `dist/`.

## Limpeza local

Use o script abaixo para remover artefatos de build antes de validar ou exportar o projeto:

```bash
npm run clean
```

Esse script remove `dist/`, `dist-ssr/`, `.vite/`, logs e artefatos temporários de TypeScript/Vite na raiz do projeto. Ele não remove `node_modules/` automaticamente. Para simular uma instalação totalmente limpa, remova `node_modules/` manualmente antes de rodar `npm install`.

## Instalação limpa

Antes de validar um deploy, teste como o Netlify faria:

```bash
rm -rf node_modules dist
npm install
npm run validate:beta
npm run build
```

No Windows (PowerShell):

```powershell
Remove-Item -Recurse -Force node_modules, dist -ErrorAction SilentlyContinue
npm install
npm run validate:beta
npm run build
```

`validate:beta` roda typecheck e todos os validadores de conteúdo/encoding. Nunca versione `node_modules/`. Nunca versione `dist/` quando o Netlify vai gerar o build. Nunca coloque `.git/` dentro de ZIPs de entrega. Nunca coloque ZIPs na raiz do projeto ou no repositório. Use sempre uma instalação limpa com `npm install` para confirmar que `package-lock.json` e `package.json` bastam para reconstruir o app.

Se aparecer erro do Rollup (`Cannot find module @rollup/rollup-linux-x64-gnu`), `tsc: Permission denied` ou `vite: Permission denied`, não reutilize `node_modules` de ZIP. Apague `node_modules`, rode `npm install` de novo e deixe o npm instalar os `optionalDependencies` da plataforma. O `netlify.toml` usa `npm ci` e o build chama TypeScript/Vite via `node` (scripts em `scripts/`) para evitar binários sem permissão de execução no Linux.

## ZIP de entrega

Se precisar enviar o projeto como ZIP, não compacte a pasta inteira pelo explorador de arquivos, porque isso pode incluir `.git/`, `node_modules/`, `dist/`, logs e ZIPs antigos. Em um repositório Git válido, gere o ZIP a partir dos arquivos versionados:

```bash
git archive --format=zip --output=longyu-clean.zip HEAD
```

Antes de exportar, rode `npm run clean`. O ZIP de entrega deve conter o código-fonte, `package.json`, `package-lock.json`, configs e assets públicos, mas não deve conter `.git/`, `node_modules/`, `dist/`, `.netlify/`, `.vite/`, logs, `.env` ou outros arquivos `.zip`.

## Preview local do build

```bash
npm run preview
```

Use o preview para testar rotas internas, reload de página e comportamento mobile antes do deploy.

## Deploy beta (Netlify)

O deploy é estático. Conecte o repositório Git e deixe o Netlify instalar dependências e gerar `dist/` no build.

### Checklist antes de publicar

1. Rode instalação limpa local (`npm install` + `npm run validate:beta` + `npm run build`).
2. Confirme que `node_modules/`, `dist/`, `*.zip`, `.env*` e logs **não** entram no Git (`.gitignore` já cobre).
3. Suba apenas código-fonte, `package.json`, `package-lock.json`, `netlify.toml` e assets públicos.
4. Não coloque segredos no frontend — variáveis `VITE_*` ficam visíveis no bundle.

### Configuração no painel Netlify

| Campo | Valor |
|-------|-------|
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | `20` (já em `netlify.toml`) |

**Com backend ativo**, adicione em *Site settings → Environment variables*:

| Variável | Valor |
|----------|-------|
| `VITE_BACKEND_MODE` | `supabase` |
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | chave anon (pública) |

Depois do primeiro deploy, inclua a URL de produção nos redirects do Supabase Auth:

```bash
npm run configure:supabase-auth -- --add-prod-url https://seu-site.netlify.app
```

O `netlify.toml` na raiz já define:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Esse redirect SPA garante que rotas do React Router (`/jornada`, `/revisao`, `/pinyin`, `/licao/:id`, etc.) funcionem ao atualizar a página.

### O que nunca subir

- `node_modules/` (o Netlify roda `npm install`)
- `dist/` (o Netlify roda `npm run build`)
- ZIPs de entrega na raiz do repositório
- `.env`, `.env.local` ou backups (`*.bak`, `*.old`)
- `node_modules` extraído de ZIP (quebra binários do Rollup no Linux)

## Segurança

- Não coloque chaves secretas (`service_role`, Stripe, webhook) no frontend — só em Supabase secrets / Edge Functions.
- Variáveis `VITE_*` ficam visíveis no bundle do navegador; use apenas URL e anon key do Supabase.
- Pro **real** vem do servidor (`subscriptions` + webhook Stripe), não de flag local. O Pro Preview local continua disponível sem cobrança.
- `localStorage` guarda progresso local; com conta na nuvem, o snapshot também vai para `user_progress` no Postgres (RLS por usuário).

## Backend (Supabase + Stripe)

Roadmap detalhado: [`ROADMAP_BACKEND.md`](ROADMAP_BACKEND.md).

| Fase | Estado |
|------|--------|
| Auth + sync de progresso | ✅ |
| Edge Functions (checkout, webhook, LGPD) | ✅ publicadas |
| Stripe live | ⬜ secrets + webhook |
| Economia autoritativa no servidor | ⬜ planejado |

Comandos:

```bash
npm run setup:supabase
npm run deploy:backend -- --all
npm run verify:production
```

## Variáveis de ambiente

Crie arquivos `.env.local` apenas para valores públicos de desenvolvimento. Arquivos `.env` e `.env.local` ficam fora do versionamento.
