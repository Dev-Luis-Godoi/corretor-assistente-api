# AGENTS.md

## Objetivo

Construir um SaaS para corretores de imóveis chamado Corretor Assistente.

O foco é organizar clientes vindos do WhatsApp.

## Stack

- Node.js
- TypeScript
- Fastify
- Prisma
- PostgreSQL
- React
- Vite
- Tailwind
- Zod

## Padrões

- Nunca acessar Prisma em Controllers.
- Toda regra de negócio fica em Services.
- Toda entrada deve ser validada com Zod.
- Controllers apenas recebem Request e retornam Response.
- Utilizar async/await.
- Nunca utilizar any.
- TypeScript strict.
- Sempre utilizar aliases (@/).
- Código em inglês.
- Comentários apenas quando realmente necessários.

## Estrutura

src/
modules/
infra/
shared/
config/

## Convenções

- Um módulo = controller + service + routes + schema.
- Sempre criar tipos quando necessário.
- Utilizar injeção de dependência quando fizer sentido.
- Código limpo e legível.
