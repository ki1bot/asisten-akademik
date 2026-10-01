FROM node:22-bookworm-slim AS development

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        g++ \
        make \
        openssl \
        python3 \
    && npm install --global pnpm@11.20.0 \
    && npm cache clean --force \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

RUN chown node:node /workspace

USER node

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

COPY --chown=node:node apps/web/package.json ./apps/web/package.json
COPY --chown=node:node apps/mobile/package.json ./apps/mobile/package.json

COPY --chown=node:node packages/contracts/package.json ./packages/contracts/package.json
COPY --chown=node:node packages/validation/package.json ./packages/validation/package.json
COPY --chown=node:node packages/api-client/package.json ./packages/api-client/package.json

RUN pnpm install --frozen-lockfile

COPY --chown=node:node . .

EXPOSE 3000
EXPOSE 8081

CMD ["pnpm", "dev"]