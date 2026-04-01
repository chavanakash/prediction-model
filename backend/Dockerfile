# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json .npmrc ./
# Cache node_modules on the build host — survives between Jenkins builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --prefer-offline || npm install --omit=dev

FROM node:20-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./
USER appuser
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://localhost:5000/health || exit 1
CMD ["node", "src/index.js"]
