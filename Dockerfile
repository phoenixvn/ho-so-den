# SPDX-License-Identifier: AGPL-3.0-only
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY index.html app.js article.js styles.css wiki.css LICENSE NOTICE THIRD_PARTY_NOTICES.md ./
COPY scripts/ ./scripts/
RUN npm run build

FROM node:24-alpine AS runtime
LABEL org.opencontainers.image.title="Ho So Den - design preview" \
      org.opencontainers.image.source="https://github.com/realitechteam/ho-so-den" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node scripts/serve.mjs ./scripts/serve.mjs
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/serve.mjs"]
