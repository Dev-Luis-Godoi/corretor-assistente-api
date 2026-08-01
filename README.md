# Corretor Assistente API

API REST multi-tenant para o **Corretor Assistente**, um SaaS voltado à organização de contatos, leads, pipelines e conversas de corretores de imóveis.

O projeto fornece a base do MVP da aplicação: autenticação, isolamento por organização, contatos, funil comercial, leads e uma estrutura de leitura preparada para futura integração com a Evolution API.

## Sumário

- [Recursos disponíveis](#recursos-disponíveis)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Executando localmente](#executando-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts](#scripts)
- [Autenticação](#autenticação)
- [Endpoints](#endpoints)
- [Multi-tenancy e segurança](#multi-tenancy-e-segurança)
- [Banco de dados e Prisma](#banco-de-dados-e-prisma)
- [Testes e qualidade](#testes-e-qualidade)
- [Status do MVP](#status-do-mvp)
- [Próximos passos](#próximos-passos)

## Recursos disponíveis

- Cadastro de organização e usuário proprietário.
- Login com JWT armazenado em cookie HttpOnly.
- Recuperação do usuário autenticado.
- Etapas padrão criadas automaticamente para novas organizações.
- CRUD de contatos.
- Pipeline personalizável e reordenável.
- Criação e listagem de leads.
- Movimentação de leads entre etapas.
- Listagem de conversas e mensagens do WhatsApp.
- Paginação e filtros nas principais listagens.
- Validação de entrada com Zod.
- Tratamento global de erros.
- Isolamento de dados por organização.
- Testes unitários e HTTP com Vitest e `app.inject()`.

> A integração com o WhatsApp ainda não envia nem recebe mensagens. O módulo atual é somente leitura e prepara os limites arquiteturais para uma futura integração com a Evolution API.

## Stack

- Node.js 22+
- TypeScript em modo strict
- Fastify
- Prisma ORM
- PostgreSQL
- Zod
- JWT em cookie HttpOnly
- bcryptjs
- Vitest
- ESLint
- Prettier
- Docker Compose

## Arquitetura

O código segue uma arquitetura modular simples:

```text
src/
├── app.ts
├── server.ts
├── config/
│   └── env.ts
├── infra/
│   └── database/
│       └── prisma.ts
├── modules/
│   ├── auth/
│   ├── contacts/
│   ├── leads/
│   ├── pipelines/
│   └── whatsapp/
└── shared/
    ├── crypto/
    ├── errors/
    └── http/
```

Responsabilidades:

- **Routes:** registram endpoints, middleware e dependências.
- **Controllers:** validam a entrada, chamam Services e constroem a resposta HTTP.
- **Services:** concentram regras de negócio e acesso ao Prisma.
- **Schemas:** definem e transformam entradas com Zod.
- **Infra:** contém integrações técnicas, como Prisma e PostgreSQL.
- **Shared:** reúne autenticação, erros e criptografia reutilizáveis.

Controllers nunca acessam o Prisma diretamente. Toda consulta sensível recebe o `organizationId` obtido do JWT autenticado.

O alias `@/` aponta para `src/`. Durante o build, `tsc-alias` converte os aliases para caminhos executáveis pelo Node.js.

## Pré-requisitos

- Node.js 22 ou superior.
- npm.
- Docker e Docker Compose, ou uma instância PostgreSQL disponível.

## Executando localmente

### 1. Clone o repositório

```bash
git clone https://github.com/Dev-Luis-Godoi/corretor-assistente-api.git
cd corretor-assistente-api
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o ambiente

Copie `.env.example` para `.env`:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Troque o `JWT_SECRET` por um valor longo, aleatório e exclusivo do ambiente.

### 4. Inicie o PostgreSQL

```bash
docker compose up -d
```

O Docker Compose inicia PostgreSQL na porta `5432` com um volume persistente.

Para usar a configuração do Docker deste repositório, a URL local pode ser:

```env
DATABASE_URL=postgresql://corretor:corretor@localhost:5432/corretor_assistente?schema=public
```

As credenciais do `docker-compose.yml` são destinadas exclusivamente ao desenvolvimento local.

### 5. Gere o Prisma Client

```bash
npm run prisma:generate
```

### 6. Aplique as migrations

Em desenvolvimento:

```bash
npm run prisma:migrate
```

Em produção ou CI:

```bash
npm run prisma:deploy
```

### 7. Inicie a API

```bash
npm run dev
```

Por padrão, a API fica disponível em:

```text
http://localhost:3333
```

Teste o health check:

```bash
curl http://localhost:3333/health
```

Resposta:

```json
{
  "status": "ok",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

## Variáveis de ambiente

| Variável       | Obrigatória | Padrão                  | Descrição                                                     |
| -------------- | ----------- | ----------------------- | ------------------------------------------------------------- |
| `NODE_ENV`     | Não         | `development`           | Ambiente: `development`, `test` ou `production`.              |
| `HOST`         | Não         | `0.0.0.0`               | Interface em que o Fastify escuta.                            |
| `PORT`         | Não         | `3333`                  | Porta HTTP da API.                                            |
| `LOG_LEVEL`    | Não         | `info`                  | Nível do logger Fastify/Pino.                                 |
| `CORS_ORIGIN`  | Não         | `http://localhost:5173` | Origens autorizadas, separadas por vírgula. `*` não é aceito. |
| `DATABASE_URL` | Sim         | —                       | Connection string PostgreSQL.                                 |
| `JWT_SECRET`   | Sim         | —                       | Segredo JWT com no mínimo 32 caracteres.                      |

Exemplo:

```env
NODE_ENV=development
HOST=0.0.0.0
PORT=3333
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://corretor:corretor@localhost:5432/corretor_assistente?schema=public
JWT_SECRET=substitua-por-um-segredo-forte-e-aleatorio
```

Mais de uma origem pode ser autorizada:

```env
CORS_ORIGIN=http://localhost:5173,https://app.seudominio.com
```

## Scripts

| Script                    | Descrição                                   |
| ------------------------- | ------------------------------------------- |
| `npm run dev`             | Executa a API em modo watch com TSX.        |
| `npm run build`           | Compila TypeScript e resolve os aliases.    |
| `npm start`               | Executa o build em `dist/`.                 |
| `npm run typecheck`       | Verifica tipos sem emitir arquivos.         |
| `npm run lint`            | Executa o ESLint.                           |
| `npm run lint:fix`        | Corrige problemas suportados pelo ESLint.   |
| `npm run format`          | Formata os arquivos com Prettier.           |
| `npm run format:check`    | Verifica a formatação sem alterar arquivos. |
| `npm test`                | Executa todos os testes uma vez.            |
| `npm run test:watch`      | Executa Vitest em modo watch.               |
| `npm run prisma:generate` | Gera o Prisma Client.                       |
| `npm run prisma:format`   | Formata o schema Prisma.                    |
| `npm run prisma:migrate`  | Cria/aplica migrations em desenvolvimento.  |
| `npm run prisma:deploy`   | Aplica migrations pendentes em produção.    |
| `npm run prisma:studio`   | Abre o Prisma Studio.                       |

## Autenticação

A API usa JWT armazenado no cookie `accessToken`.

Configuração do cookie:

- `HttpOnly`: JavaScript do navegador não consegue ler o token.
- `Secure`: habilitado automaticamente em produção.
- `SameSite=Lax`: reduz exposição a requisições cross-site.
- `Path=/`: cookie disponível para toda a API.
- Expiração atual: 7 dias.

O token contém:

- `sub`: ID do usuário.
- `organizationId`: organização do usuário.
- `role`: papel do usuário.

No frontend, envie cookies em todas as requisições autenticadas:

```ts
const response = await fetch("http://localhost:3333/auth/me", {
  credentials: "include",
});
```

Com Axios:

```ts
import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3333",
  withCredentials: true,
});
```

### Exemplo de cadastro com cURL

```bash
curl -i \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"organizationName":"Imobiliária Exemplo","name":"Luis","email":"luis@example.com","password":"senha-segura"}' \
  http://localhost:3333/auth/register
```

### Exemplo de requisição autenticada

```bash
curl -b cookies.txt http://localhost:3333/auth/me
```

## Endpoints

Todos os endpoints, exceto Health Check, Register e Login, exigem autenticação.

### Health Check

| Método | Rota      | Descrição                           |
| ------ | --------- | ----------------------------------- |
| `GET`  | `/health` | Verifica se a API está respondendo. |

### Auth

| Método | Rota             | Descrição                                          |
| ------ | ---------------- | -------------------------------------------------- |
| `POST` | `/auth/register` | Cria organização, usuário OWNER e pipeline padrão. |
| `POST` | `/auth/login`    | Autentica e define o cookie JWT.                   |
| `GET`  | `/auth/me`       | Retorna o usuário autenticado.                     |

Cadastro:

```json
{
  "organizationName": "Imobiliária Exemplo",
  "name": "Luis Godoi",
  "email": "luis@example.com",
  "password": "senha-segura"
}
```

Login:

```json
{
  "email": "luis@example.com",
  "password": "senha-segura"
}
```

O cadastro cria as seguintes etapas:

1. Novo lead
2. Primeiro contato
3. Visita
4. Negociação
5. Fechado
6. Perdido

`Fechado` é marcado como ganho e `Perdido` como perdido.

### Contacts

| Método   | Rota                   | Descrição                         |
| -------- | ---------------------- | --------------------------------- |
| `POST`   | `/contacts`            | Cria um contato.                  |
| `GET`    | `/contacts`            | Lista contatos da organização.    |
| `GET`    | `/contacts/:contactId` | Busca um contato por ID.          |
| `PATCH`  | `/contacts/:contactId` | Atualiza parcialmente um contato. |
| `DELETE` | `/contacts/:contactId` | Exclui um contato sem vínculos.   |

Criação:

```json
{
  "name": "Maria Silva",
  "phone": "+55 (11) 99999-9999",
  "email": "maria@example.com",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

O telefone é normalizado antes da persistência. Não é permitido excluir contatos que tenham leads ou conversas vinculados.

Parâmetros de listagem:

| Query    | Padrão | Descrição                           |
| -------- | ------ | ----------------------------------- |
| `page`   | `1`    | Página atual.                       |
| `limit`  | `20`   | Itens por página, máximo 100.       |
| `search` | —      | Busca por nome, telefone ou e-mail. |

### Pipeline

| Método   | Rota                        | Descrição                         |
| -------- | --------------------------- | --------------------------------- |
| `GET`    | `/pipeline/stages`          | Lista etapas em ordem crescente.  |
| `POST`   | `/pipeline/stages`          | Cria uma etapa na última posição. |
| `PATCH`  | `/pipeline/stages/:stageId` | Atualiza nome ou cor.             |
| `PATCH`  | `/pipeline/stages/reorder`  | Reordena todas as etapas.         |
| `DELETE` | `/pipeline/stages/:stageId` | Exclui uma etapa permitida.       |

Criação:

```json
{
  "name": "Proposta enviada",
  "color": "#8B5CF6"
}
```

Reordenação:

```json
{
  "stageIds": ["uuid-stage-3", "uuid-stage-1", "uuid-stage-2"]
}
```

A reordenação deve conter todas as etapas atuais sem IDs duplicados. A operação utiliza uma transação em duas fases para evitar conflitos no índice único de posição.

Uma etapa não pode ser excluída quando:

- possui leads associados;
- é a última etapa disponível da organização.

### Leads

| Método  | Rota               | Descrição                                    |
| ------- | ------------------ | -------------------------------------------- |
| `POST`  | `/leads`           | Cria um lead para a organização autenticada. |
| `GET`   | `/leads`           | Lista e filtra leads.                        |
| `PATCH` | `/leads/:id/stage` | Move um lead para outra etapa.               |

Criação:

```json
{
  "title": "Apartamento no Centro",
  "contactId": "uuid-do-contato",
  "stageId": "uuid-da-etapa",
  "assignedUserId": "uuid-do-corretor",
  "source": "WhatsApp",
  "notes": "Interessado em imóvel com duas vagas",
  "estimatedValue": 850000
}
```

`contactId`, `stageId` e `assignedUserId`, quando informado, precisam pertencer à mesma organização do usuário autenticado.

Parâmetros de listagem:

| Query            | Padrão | Descrição                      |
| ---------------- | ------ | ------------------------------ |
| `page`           | `1`    | Página atual.                  |
| `limit`          | `20`   | Itens por página, máximo 100.  |
| `stageId`        | —      | Filtra pela etapa.             |
| `assignedUserId` | —      | Filtra pelo usuário atribuído. |
| `search`         | —      | Busca pelo título.             |

Movimentação:

```json
{
  "stageId": "uuid-da-nova-etapa"
}
```

### WhatsApp

| Método | Rota                                               | Descrição                        |
| ------ | -------------------------------------------------- | -------------------------------- |
| `GET`  | `/whatsapp/conversations`                          | Lista conversas da organização.  |
| `GET`  | `/whatsapp/conversations/:id`                      | Retorna uma conversa.            |
| `GET`  | `/whatsapp/conversations/:conversationId/messages` | Lista mensagens de uma conversa. |

Filtros de conversas:

- `page`
- `limit`
- `status`: `OPEN`, `CLOSED` ou `ARCHIVED`
- `whatsappAccountId`
- `search`: nome ou telefone do contato

Filtros de mensagens:

- `page`
- `limit`
- `direction`: `INBOUND` ou `OUTBOUND`
- `type`: `TEXT`, `IMAGE`, `AUDIO`, `VIDEO`, `DOCUMENT`, `LOCATION`, `CONTACT` ou `UNKNOWN`

## Respostas e erros

Erros de regra de negócio seguem o formato:

```json
{
  "error": "ERROR_CODE",
  "message": "Descrição do erro"
}
```

Erros de validação retornam `400`:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid request data",
  "issues": []
}
```

Códigos HTTP usados:

- `200`: operação concluída.
- `201`: recurso criado.
- `204`: recurso excluído sem conteúdo de resposta.
- `400`: entrada ou operação inválida.
- `401`: autenticação ausente ou inválida.
- `404`: recurso não encontrado dentro da organização.
- `409`: conflito, duplicidade ou vínculo que impede exclusão.
- `500`: falha interna não prevista.

Listagens paginadas usam:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

## Multi-tenancy e segurança

Cada usuário pertence a uma `Organization`. O `organizationId` é incorporado ao JWT durante autenticação e nunca deve ser aceito do frontend.

Proteções implementadas:

- Senhas armazenadas com bcrypt.
- JWT assinado com segredo validado no startup.
- Token armazenado em cookie HttpOnly.
- Cookie `Secure` em produção e `SameSite=Lax`.
- CORS limitado a origens explícitas.
- Schemas strict em operações sensíveis.
- Consultas filtradas por `organizationId`.
- Validação de relações multi-tenant antes da criação de leads.
- Erros internos ocultados em produção.
- Testes de isolamento entre organizações.
- `.env`, dependências e artefatos de build ignorados pelo Git.

Antes de produção, ainda é recomendado adicionar:

- rate limiting para Login e Register;
- headers de segurança com Helmet;
- política CSRF explícita ou validação adicional de `Origin`;
- autorização granular por papéis;
- revogação e gerenciamento de sessões;
- logs de auditoria sem dados sensíveis;
- usuário PostgreSQL com privilégios mínimos;
- backups e monitoramento;
- testes end-to-end contra PostgreSQL real.

Nenhuma aplicação pode oferecer risco zero. O isolamento atual reduz vazamentos acidentais entre tenants, mas segurança em produção também depende da infraestrutura, configuração de segredos, banco, domínio e processo operacional.

## Banco de dados e Prisma

Principais entidades:

- `Organization`
- `User`
- `Contact`
- `PipelineStage`
- `Lead`
- `WhatsappAccount`
- `Conversation`
- `Message`

O Prisma Client utiliza `@prisma/adapter-pg`. O datasource e o caminho das migrations são configurados em `prisma.config.ts`.

Depois de alterar `prisma/schema.prisma`:

```bash
npm run prisma:format
npm run prisma:migrate
npm run prisma:generate
```

Não edite manualmente os arquivos em `src/generated/prisma`.

## Testes e qualidade

Execute toda a suíte:

```bash
npm test
```

Verificações recomendadas antes de cada commit:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

Os testes atuais cobrem, entre outros pontos:

- PasswordService.
- Health check.
- autenticação e proteção de rotas;
- validação Zod;
- isolamento multi-tenant de contatos, leads, pipeline e WhatsApp;
- reordenação segura do pipeline;
- restrições de exclusão;
- etapas padrão de novas organizações;
- bloqueio de CORS para origens não autorizadas.

## Status do MVP

| Área                          | Status                        |
| ----------------------------- | ----------------------------- |
| Infraestrutura Fastify/Prisma | Pronta                        |
| Autenticação                  | MVP pronto                    |
| Contacts                      | MVP pronto                    |
| Pipeline                      | MVP pronto                    |
| Leads                         | MVP básico pronto             |
| WhatsApp                      | Estrutura de leitura pronta   |
| Evolution API                 | Não implementada              |
| Usuários e permissões         | Pendente                      |
| Frontend                      | Repositório separado/pendente |

## Próximos passos

1. Criar o frontend com React, Vite e Tailwind.
2. Adicionar detalhes e edição completa de leads.
3. Implementar gestão de usuários e permissões.
4. Integrar contas WhatsApp com a Evolution API.
5. Criar webhook idempotente para mensagens recebidas.
6. Implementar envio de mensagens e status de entrega.
7. Adicionar hardening de segurança e observabilidade.
8. Criar pipeline de CI/CD.

## Licença

Este projeto está licenciado sob a licença ISC, conforme definido em `package.json`.
