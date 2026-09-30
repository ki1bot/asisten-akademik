FROM node:22-bookworm-slim AS development

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        g++ \
        make \
        openssl \
        python3 \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@11.20.0 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json

COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/validation/package.json ./packages/validation/package.json
COPY packages/api-client/package.json ./packages/api-client/package.json

RUN pnpm install --frozen-lockfile

COPY --chown=node:node . .

RUN chown -R node:node /workspace

USER node

EXPOSE 3000
EXPOSE 3001
EXPOSE 8081

CMD ["pnpm", "dev"]