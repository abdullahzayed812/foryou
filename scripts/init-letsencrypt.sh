#!/usr/bin/env bash
# One-time bootstrap for the real Let's Encrypt cert — run ONCE from the
# repo root on the VPS, after `docker compose -f docker-compose.prod.yml
# up -d` has been attempted at least once (it's fine if `web` failed to
# start — postgres/redis/api/worker/migrate/certbot just need to exist):
#
#   ./scripts/init-letsencrypt.sh
#
# Why this exists: docker/nginx/web.conf's 443 server block references
# /etc/letsencrypt/live/${DOMAIN}/*.pem — files that don't exist on a fresh
# VPS. Nginx refuses to even start with a missing cert file, but certbot
# needs an Nginx already answering port 80 (serving /.well-known/acme-challenge/)
# to complete the webroot validation. So: make a throwaway dummy cert so
# `web` *can* start, then swap it for the real one and reload. Only needs to
# run once — the `certbot` service in docker-compose.prod.yml handles
# renewal forever after this, and unlike a `--standalone` setup, none of
# this requires ever stopping `web` (its own port-80 server block already
# serves the ACME challenge).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo ".env not found — run ./scripts/setup-prod-env.sh first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

domain="${DOMAIN:?Set DOMAIN in .env first}"
email="${CERTBOT_EMAIL:?Set CERTBOT_EMAIL in .env first (used for renewal/expiry notices)}"
# Set STAGING=1 for a dry run against LE's staging environment first (real
# certs are rate-limited; staging isn't) — e.g. `STAGING=1 ./scripts/init-letsencrypt.sh`.
staging_arg=""
[[ "${STAGING:-0}" = "1" ]] && staging_arg="--staging"

compose() { docker compose -f docker-compose.prod.yml "$@"; }

echo "### Creating a dummy cert so web can start ..."
compose run --rm --entrypoint "/bin/sh -c '\
  mkdir -p /etc/letsencrypt/live/$domain && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$domain/privkey.pem \
    -out /etc/letsencrypt/live/$domain/fullchain.pem \
    -subj /CN=localhost'" certbot

echo "### Starting web ..."
compose up -d web

echo "### Deleting the dummy cert ..."
compose run --rm --entrypoint "/bin/sh -c '\
  rm -rf /etc/letsencrypt/live/$domain \
         /etc/letsencrypt/archive/$domain \
         /etc/letsencrypt/renewal/$domain.conf'" certbot

echo "### Requesting the real cert from Let's Encrypt ..."
# --entrypoint certbot is required: the certbot service's own entrypoint
# (docker-compose.prod.yml) is the long-running renew loop, not the certbot
# binary directly, so `run` without this override would silently ignore the
# `certonly ...` args below and just run that loop instead.
compose run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
  --email "$email" --agree-tos --no-eff-email $staging_arg \
  -d "$domain"

echo "### Restarting web with the real cert ..."
compose up -d --force-recreate web

echo
echo "Done. https://$domain should now work."
[[ -n "$staging_arg" ]] && echo "NOTE: this is a STAGING cert (untrusted by browsers) — rerun without STAGING=1 for a real one."
