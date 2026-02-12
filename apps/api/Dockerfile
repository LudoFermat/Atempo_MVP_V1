FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @atempo/shared build
RUN pnpm --filter @atempo/api prisma:generate
RUN pnpm --filter @atempo/api build

EXPOSE 4000
CMD ["pnpm", "--filter", "@atempo/api", "start"]
