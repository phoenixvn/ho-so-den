# SPDX-License-Identifier: AGPL-3.0-only
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY index.html app.js article.js styles.css wiki.css local.html local.js local.css runtime.js contribution-ui.js community.html community.js LICENSE NOTICE THIRD_PARTY_NOTICES.md ./
COPY scripts/ ./scripts/
RUN npm run build

FROM node:24-alpine AS runtime
LABEL org.opencontainers.image.title="Ho So Den - local archive alpha" \
      org.opencontainers.image.source="https://github.com/phoenixvn/ho-so-den" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 HSD_DATA_DIR=/app/data
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node scripts/serve.mjs scripts/local.mjs ./scripts/
COPY --chown=node:node server/ ./server/
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/local.mjs"]
