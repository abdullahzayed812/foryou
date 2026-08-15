# Host-level Nginx (VPS)

These configs run on the VPS itself — separate from `docker/nginx/web.conf`,
which only runs *inside* the `web` container. The VPS Nginx owns the public
port 80/443 and reverse-proxies by hostname to the containers, which
`docker-compose.prod.yml` binds to `127.0.0.1` only (never reachable directly
from outside the box). This is what lets citymarket.tech host other
sites/apps on the same VPS alongside this one.

```
Internet → VPS Nginx (80/443, TLS) → 127.0.0.1:${WEB_PORT}  (web container)
                                    → 127.0.0.1:${API_PORT}  (api container)
```

## Install

```bash
sudo cp connection-upgrade-map.conf /etc/nginx/conf.d/
sudo cp foryou.citymarket.tech.conf api.foryou.citymarket.tech.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/foryou.citymarket.tech.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.foryou.citymarket.tech.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Point both DNS records (foryou.citymarket.tech, api.foryou.citymarket.tech)
# at the VPS first, then obtain certs — certbot's nginx plugin edits these
# files in place to add the 443 server block + HTTP→HTTPS redirect:
sudo certbot --nginx -d foryou.citymarket.tech -d api.foryou.citymarket.tech
```

Make sure `WEB_PORT`/`API_PORT` in the deploy host's `.env` match the
`proxy_pass` ports in these two conf files (defaults: 8081 and 4000).
