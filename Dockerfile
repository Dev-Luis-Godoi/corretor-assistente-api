FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY src ./src
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm run prisma:generate
RUN npm run build

FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system nodeapp && useradd --system --gid nodeapp nodeapp
COPY --from=build --chown=nodeapp:nodeapp /app/package.json /app/package-lock.json ./
COPY --from=build --chown=nodeapp:nodeapp /app/node_modules ./node_modules
COPY --from=build --chown=nodeapp:nodeapp /app/dist ./dist
COPY --from=build --chown=nodeapp:nodeapp /app/prisma ./prisma
COPY --from=build --chown=nodeapp:nodeapp /app/prisma.config.ts ./prisma.config.ts
USER nodeapp

EXPOSE 3333
CMD ["npm", "start"]
