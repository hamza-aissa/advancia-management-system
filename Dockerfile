# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS api-build
WORKDIR /build/api
COPY api/package.json api/package-lock.json ./
RUN npm ci
COPY api/tsconfig.json ./
COPY api/src ./src
RUN npm run build

FROM node:22-alpine AS api-dependencies
WORKDIR /build/api
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS client-build
WORKDIR /build/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV STATIC_DIR=/app/public
WORKDIR /app

COPY --from=api-dependencies --chown=node:node /build/api/node_modules ./node_modules
COPY --from=api-build --chown=node:node /build/api/dist ./dist
COPY --chown=node:node api/package.json ./package.json
COPY --from=client-build --chown=node:node /build/client/dist ./public

USER node
EXPOSE 10000
CMD ["sh", "-c", "node dist/scripts/seed.js && node dist/index.js"]
