# Build context is the repo root (npm workspaces) — build with:
#   docker build -f apps/web/Dockerfile -t foryou-web \
#     --build-arg VITE_API_URL=https://api.example.com/api/v1 .
# Vite inlines VITE_-prefixed vars at build time, so the API URL the built
# bundle talks to must be supplied here, not at container start.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web

ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build -w packages/shared && npm run build -w apps/web

FROM nginx:1.27-alpine AS runtime
# `${DOMAIN}` in web.conf is substituted at container *start* (not here at
# build time) by nginx's built-in entrypoint envsubst-on-templates step —
# templates/ + .template suffix opts into that automatically, no custom
# entrypoint needed. See docker-compose.prod.yml for where DOMAIN comes from.
COPY docker/nginx/web.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80 443
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/nginx-health >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
