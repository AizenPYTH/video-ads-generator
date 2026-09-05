# syntax=docker/dockerfile:1
#
# The backend cannot run on a serverless platform: it launches Chromium,
# renders video for minutes at a time and writes files to disk. This image
# runs on anything that takes a container - Railway, Render, Fly, Cloud Run.

FROM node:22-bookworm-slim AS base
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app

# ---- build: compile TypeScript ----
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY remotion ./remotion
RUN npm run build

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    STORAGE_DIR=/app/storage

COPY package.json package-lock.json ./
# `--with-deps` pulls the system libraries Chromium needs. The same install
# also lays down chrome-headless-shell, which Remotion resolves by itself -
# the two need different binaries.
RUN npm ci --omit=dev \
 && npx playwright install --with-deps chromium \
 && npm cache clean --force \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/dist ./dist
COPY tsconfig.json ./
# Remotion bundles its composition from TypeScript source at render time, so
# these have to ship even though `dist` is what boots.
COPY src ./src
COPY remotion ./remotion

# Renders and captures live here. Mount a volume to keep them across
# restarts; without one they are simply regenerated on demand.
RUN mkdir -p /app/storage
VOLUME ["/app/storage"]

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/src/server.js"]
