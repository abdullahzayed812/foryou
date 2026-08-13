# Build context is the repo root (npm workspaces) — build with:
#   docker build -f apps/api/Dockerfile -t foryou-api .
# The same image serves both the API and worker containers; only the CMD
# (see docker-compose.prod.yml) differs.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w packages/shared && npm run build -w apps/api

# Drops devDependencies (tsx, vitest, drizzle-kit, eslint, the whole web
# toolchain, ...) from node_modules across every workspace, in place.
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S foryou && adduser -S foryou -G foryou

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/drizzle apps/api/drizzle

# drizzle-orm's migrator resolves its `migrationsFolder` relative to cwd, not
# to migrate.js's own location — cwd must be apps/api for "./drizzle" to
# find the copy above. Node's module resolution still walks up to /app/node_modules
# from here, so this doesn't break require/import of anything.
WORKDIR /app/apps/api

USER foryou
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||4000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
