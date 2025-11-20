# Supabase Setup Guide - 0xAcademy Backend

Este guia detalha como configurar e usar o Supabase no projeto 0xAcademy Backend.

## 📋 Índice

- [Pré-requisitos](#pré-requisitos)
- [Configuração Inicial](#configuração-inicial)
- [Desenvolvimento Local](#desenvolvimento-local)
- [Migrations](#migrations)
- [Seed Data](#seed-data)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Produção](#produção)
- [Troubleshooting](#troubleshooting)

## 🔧 Pré-requisitos

### Instalar Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (via Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase
```

### Docker Desktop

O Supabase local roda no Docker. Instale:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## ⚙️ Configuração Inicial

### 1. Criar Projeto no Supabase Cloud

1. Acesse [supabase.com](https://supabase.com)
2. Crie uma nova organização e projeto
3. Anote as credenciais:
   - **Project URL** (SUPABASE_URL)
   - **Anon Key** (SUPABASE_ANON_KEY)
   - **Service Role Key** (SUPABASE_SERVICE_KEY)

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp .env.example .env
```

Edite `.env` e configure:

```env
# Supabase Configuration
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_KEY=sua-service-role-key-aqui

# JWT Configuration
JWT_SECRET=seu-jwt-secret-minimo-32-caracteres-aqui
JWT_EXPIRES_IN=7d

# Server Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# SIWE Configuration
SIWE_DOMAIN=localhost
SIWE_ORIGIN=http://localhost:3000
```

### 3. Linkar com Projeto Cloud (Opcional)

Para sincronizar migrations com o projeto cloud:

```bash
pnpm supabase:link
```

Você será solicitado a inserir:
- Project Reference ID (encontre em Settings > General)
- Database Password

## 🏠 Desenvolvimento Local

### Iniciar Supabase Local

```bash
# Inicia todos os serviços do Supabase (Postgres, Auth, Storage, etc)
pnpm supabase:start
```

Serviços disponíveis:
- **API URL**: http://localhost:54321
- **DB URL**: postgresql://postgres:postgres@localhost:54322/postgres
- **Studio URL**: http://localhost:54323
- **Inbucket URL**: http://localhost:54324 (email testing)

### Parar Supabase Local

```bash
pnpm supabase:stop
```

### Ver Status dos Serviços

```bash
pnpm supabase:status
```

## 🗄️ Migrations

### Aplicar Migrations Existentes

As migrations são aplicadas automaticamente quando você inicia o Supabase local pela primeira vez.

Para aplicar manualmente em produção:

```bash
pnpm db:push
```

### Criar Nova Migration

```bash
pnpm db:migration:new nome_da_migration
```

Isso criará um novo arquivo em `supabase/migrations/` com timestamp.

### Resetar Banco de Dados Local

```bash
# Destrói e recria o banco com todas as migrations
pnpm db:reset
```

### Gerar Types TypeScript

Após criar ou modificar tabelas, regenere os types:

```bash
pnpm db:generate
```

Isso atualizará `src/types/database.types.ts` com os tipos atualizados.

## 🌱 Seed Data

### Carregar Dados de Desenvolvimento

Para popular o banco com dados de teste:

```bash
# Supabase local
pnpm db:seed:local

# Ou via reset (aplica migrations + seed)
pnpm db:reset
```

O seed inclui:
- **5 usuários** (2 instrutores, 3 estudantes)
- **4 cursos** em diferentes níveis
- **18 aulas** distribuídas pelos cursos
- **4 matrículas** com progresso variado
- **1 certificado** de conclusão

### Usuários de Teste

Após rodar o seed, você terá estes usuários:

| Nome | Wallet Address | Tipo |
|------|----------------|------|
| Alice Web3 | 0x1234...7890 | Instrutor |
| Bob Solidity | 0x2345...8901 | Instrutor |
| Carol Student | 0x3456...9012 | Estudante |
| Dave Learner | 0x4567...0123 | Estudante |
| Eve Crypto | 0x5678...1234 | Estudante |

## 📜 Scripts Disponíveis

### Supabase

```bash
# Gerenciar ambiente local
pnpm supabase:start    # Inicia Supabase local
pnpm supabase:stop     # Para Supabase local
pnpm supabase:status   # Verifica status dos serviços
pnpm supabase:link     # Linka com projeto cloud

# Database
pnpm db:push           # Aplica migrations (produção)
pnpm db:reset          # Reseta DB local e aplica migrations
pnpm db:seed:local     # Carrega seed data localmente
pnpm db:generate       # Gera TypeScript types do schema
pnpm db:migration:new  # Cria nova migration
```

### Desenvolvimento

```bash
pnpm dev               # Inicia servidor em modo watch
pnpm build             # Compila TypeScript
pnpm start             # Inicia servidor compilado
```

## 🚀 Produção

### Deploy das Migrations

1. **Certifique-se que está linkado ao projeto correto:**
   ```bash
   pnpm supabase:link
   ```

2. **Aplique as migrations:**
   ```bash
   supabase db push
   ```

3. **Verifique no Dashboard:**
   - Acesse Supabase Dashboard > Database > Tables
   - Confirme que todas as tabelas foram criadas

### Deploy do Backend

1. **Configure as variáveis de ambiente** no seu serviço de hosting (Vercel, Railway, Render, etc)

2. **Build e Deploy:**
   ```bash
   pnpm build
   pnpm start
   ```

## 🔍 Troubleshooting

### Erro: "Database is not running"

```bash
# Verifique se Docker está rodando
docker ps

# Reinicie o Supabase
pnpm supabase:stop
pnpm supabase:start
```

### Erro: "Migration already exists"

Se uma migration já foi aplicada:

```bash
# Resetar banco local e reaplicar tudo
pnpm db:reset
```

### Erro: "Port already in use"

Outro serviço está usando as portas do Supabase:

```bash
# Pare outros serviços Postgres ou Supabase
pnpm supabase:stop

# Verifique portas em uso
lsof -i :54321
lsof -i :54322
```

### Types não atualizando

```bash
# Regenerar types manualmente
pnpm db:generate

# Reiniciar TypeScript server no VS Code
# Cmd/Ctrl + Shift + P > "TypeScript: Restart TS Server"
```

### RLS (Row Level Security) bloqueando queries

Se queries estão falhando com "permission denied":

1. **Verifique se está usando o cliente correto:**
   - `adminClient` - Bypass RLS (operações admin)
   - `publicClient` - Respeita RLS (operações públicas)
   - `getUserClient(token)` - Respeita RLS com usuário autenticado

2. **Revise as policies em** `supabase/migrations/001_initial_schema.sql`

### Seed data não carregando

```bash
# Caminho absoluto se necessário
psql postgresql://postgres:postgres@localhost:54322/postgres -f $(pwd)/supabase/seed.sql
```

## 📚 Recursos Adicionais

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/guides/cli)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Migrations](https://supabase.com/docs/guides/database/migrations)

## 🏗️ Estrutura do Projeto

```
0xAcademy-backend/
├── src/
│   ├── config/
│   │   └── supabase.ts          # Clientes Supabase configurados
│   ├── db/
│   │   └── migrations/
│   │       └── run.ts            # Script executor de migrations
│   └── types/
│       └── database.types.ts     # Types auto-gerados
├── supabase/
│   ├── config.toml              # Configuração local
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # Schema inicial
│   └── seed.sql                 # Dados de desenvolvimento
└── .env                         # Variáveis de ambiente (não commitado)
```

## 🔒 Segurança

- ✅ **Nunca commite** o arquivo `.env` (já está no `.gitignore`)
- ✅ **Use Service Role Key** apenas no backend
- ✅ **Anon Key** é segura para expor no frontend
- ✅ **RLS Policies** protegem os dados automaticamente
- ✅ **JWT_SECRET** deve ter no mínimo 32 caracteres aleatórios

## 🎯 Próximos Passos

1. [ ] Iniciar Supabase local: `pnpm supabase:start`
2. [ ] Verificar se migrations foram aplicadas no Studio
3. [ ] Carregar seed data: `pnpm db:seed:local`
4. [ ] Iniciar backend: `pnpm dev`
5. [ ] Testar autenticação com MetaMask
6. [ ] Explorar API endpoints em `http://localhost:3001`

---

Criado com ❤️ para 0xAcademy
