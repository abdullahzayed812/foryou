#!/usr/bin/env bash
# Run this ONCE on the deploy host (the VPS), from the repo root:
#   ./scripts/setup-prod-env.sh
#
# Copies .env.production.example to .env and fills in POSTGRES_PASSWORD,
# JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (and DATABASE_URL to match) with
# freshly generated random secrets — these must never be committed to git,
# so they can't live in the example file itself, only be generated here.
#
# Everything else in .env.production.example already targets citymarket.tech
# correctly (APP_URL/WEB_URL/VITE_API_URL) and needs no edits. What's left
# for you to fill in by hand afterward:
#   - S3_ENDPOINT / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY / MEDIA_PUBLIC_BASE_URL
#     (Cloudflare R2 — required for product/verification image uploads to work)
#   - SMTP_HOST/PORT/USER/PASS (optional — email sending no-ops without it)
#   - PAYMOB_API_KEY/HMAC_SECRET/INTEGRATION_ID (optional — needed before going
#     live with real payments; PAYMOB_MODE=live is preset, so set these before
#     accepting real deposits)
#   - SENTRY_DSN (optional — error tracking is a no-op until set)
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  echo ".env already exists — refusing to overwrite it. Remove/rename it first if you really want to regenerate secrets (this would invalidate all existing sessions)." >&2
  exit 1
fi

cp .env.production.example .env

get_var() { awk -F= -v k="$1" '$1==k{print substr($0,length(k)+2)}' .env; }
set_var() {
  awk -v k="$1" -v v="$2" 'BEGIN{FS=OFS="="} $1==k{$0=k"="v} {print}' .env >.env.tmp
  mv .env.tmp .env
}

postgres_password="$(openssl rand -hex 24)"
jwt_access_secret="$(openssl rand -base64 48 | tr -d '\n')"
jwt_refresh_secret="$(openssl rand -base64 48 | tr -d '\n')"

set_var POSTGRES_PASSWORD "$postgres_password"
set_var JWT_ACCESS_SECRET "$jwt_access_secret"
set_var JWT_REFRESH_SECRET "$jwt_refresh_secret"
set_var DATABASE_URL "postgres://$(get_var POSTGRES_USER):${postgres_password}@postgres:5432/$(get_var POSTGRES_DB)"

chmod 600 .env

cat <<'EOF'
.env created with fresh POSTGRES_PASSWORD / JWT_ACCESS_SECRET / JWT_REFRESH_SECRET.

Still needed before `docker compose -f docker-compose.prod.yml up -d --build`:
  - Cloudflare R2: S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, MEDIA_PUBLIC_BASE_URL
  - (optional, can add later) SMTP_*, PAYMOB_*, SENTRY_DSN

Edit with: nano .env
EOF
