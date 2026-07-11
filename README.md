# Zappia

Atendente de WhatsApp com IA, multi-tenant: uma instância serve vários clientes
(ex.: Daniel — Cursos, Gabriel — Depósito). Responde texto e áudio, treinado no
conhecimento de cada cliente, **sem inventar informação**, com painel web para o
cliente e painel de agência para gestão e faturamento.

> Especificação completa em [`docs/`](docs/): o build spec e o
> [`prompt-mestre`](docs/zappia-prompt-mestre.md) (fonte de verdade da IA).

## Stack

| Camada | Ferramenta |
|---|---|
| Frontend + API | Next.js 16 (App Router) + TypeScript |
| Estilo | Tailwind CSS v4 |
| Ícones | lucide-react |
| Banco | Neon (Postgres serverless) + Drizzle ORM |
| Auth | Auth.js (v5) |
| WhatsApp | WhatsApp Cloud API (Meta, oficial) |
| Transcrição de áudio | Groq — Whisper Large v3 Turbo |
| IA (respostas) | Claude Haiku 4.5 (com prompt caching) |
| Hospedagem | Vercel |

## Setup local

```bash
# 1. dependências
npm install

# 2. variáveis de ambiente
cp .env.example .env.local   # depois preencha os valores

# 3. gere o AUTH_SECRET
npx auth secret              # cole o valor em AUTH_SECRET no .env.local

# 4. rode
npm run dev                  # http://localhost:3000
```

Para o banco (a partir da Fase 2), preencha `DATABASE_URL` com a connection
string do seu projeto Neon e rode as migrations.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servir o build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Gera SQL de migration a partir do schema |
| `npm run db:migrate` | Aplica migrations no banco |
| `npm run db:push` | Sincroniza o schema direto (dev) |
| `npm run db:studio` | Abre o Drizzle Studio |

## Estrutura

```
src/
  app/
    layout.tsx                     # tema (Plus Jakarta Sans + emerald)
    page.tsx                       # landing
    api/auth/[...nextauth]/route.ts
  auth.ts                          # config Auth.js (v5)
  db/
    index.ts                       # client Neon + Drizzle
    schema.ts                      # tabelas (Fase 2)
drizzle.config.ts
docs/                              # build spec + prompt mestre
```

## Roadmap (§7 do build spec)

- [x] **Fase 1 — Setup**: Next.js + Tailwind + Drizzle + Neon + Auth.js
- [ ] **Fase 2 — Schema + seed**: tabelas + client de teste (Daniel)
- [ ] **Fase 3 — Pipeline de mensagem**: webhook + Groq + Haiku ponta a ponta
- [ ] **Fase 4 — Painel do cliente**: Dashboard, Conversas, Leads, Cursos, Ajustes, Config
- [ ] **Fase 5 — Onboarding**: Login + Conectar WhatsApp
- [ ] **Fase 6 — Painel da agência**: Clientes + Faturamento
- [ ] **Fase 7 — Handoff e notificações**
- [ ] **Fase 8 — Testes com áudio real + ajuste fino do prompt**
