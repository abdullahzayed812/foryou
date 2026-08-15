#!/usr/bin/env bash
# One-time bootstrap for real Let's Encrypt certs — run ONCE from the repo
# root on the VPS, after `docker compose -f docker-compose.prod.yml up -d`
# has been run at least once (postgres/redis/api/worker/web need to exist,
# though they don't need to be healthy yet):
#
#   ./scripts/init-letsencrypt.sh
#
# Why this exists: docker/nginx/edge/conf.d/*.conf has a 443 server block
# for each domain that references /etc/letsencrypt/live/<domain>/*.pem —
# files that don't exist on a fresh VPS. Nginx refuses to even start with a
# missing cert file, but certbot needs nginx running on port 80 to answer
# the ACME HTTP-01 challenge. So: make throwaway dummy certs so nginx *can*
# start, then swap them for real ones and reload. Only needs to run once —
# the `certbot` service in docker-compose.prod.yml handles renewal forever
# after this.
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

domains=(foryou.citymarket.tech api.foryou.citymarket.tech)
email="${CERTBOT_EMAIL:?Set CERTBOT_EMAIL in .env first (used for certificate renewal/expiry notices)}"
# Set STAGING=1 for a dry run against LE's staging environment first (real
# certs are rate-limited; staging isn't) — e.g. `STAGING=1 ./scripts/init-letsencrypt.sh`.
staging_arg=""
[[ "${STAGING:-0}" = "1" ]] && staging_arg="--staging"

compose() { docker compose -f docker-compose.prod.yml "$@"; }

echo "### Creating dummy certs so nginx can start ..."
for domain in "${domains[@]}"; do
  compose run --rm --entrypoint "/bin/sh -c '\
    mkdir -p /etc/letsencrypt/live/$domain && \
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout /etc/letsencrypt/live/$domain/privkey.pem \
      -out /etc/letsencrypt/live/$domain/fullchain.pem \
      -subj /CN=localhost'" certbot
done

echo "### Starting nginx ..."
compose up -d nginx

echo "### Deleting dummy certs ..."
for domain in "${domains[@]}"; do
  compose run --rm --entrypoint "/bin/sh -c '\
    rm -rf /etc/letsencrypt/live/$domain \
           /etc/letsencrypt/archive/$domain \
           /etc/letsencrypt/renewal/$domain.conf'" certbot
done

echo "### Requesting real certs from Let's Encrypt ..."
for domain in "${domains[@]}"; do
  compose run --rm certbot certonly --webroot -w /var/www/certbot \
    --email "$email" --agree-tos --no-eff-email $staging_arg \
    -d "$domain"
done

echo "### Reloading nginx with the real certs ..."
compose exec nginx nginx -s reload

echo
echo "Done. https://foryou.citymarket.tech and https://api.foryou.citymarket.tech/healthz should now work."
[[ -n "$staging_arg" ]] && echo "NOTE: these are STAGING certs (untrusted by browsers) — rerun without STAGING=1 for real ones."
