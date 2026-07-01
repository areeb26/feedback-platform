# Contabo VPS deployment

Production deployment uses Docker Compose on a Contabo VPS. GitHub Actions runs tests and deploys on every push to `main`.

## Prerequisites

- Contabo VPS (Ubuntu 22.04+ recommended) with Docker and Docker Compose v2
- Domain DNS A record pointing to the VPS public IP
- MongoDB Atlas cluster (or other reachable MongoDB)
- Clerk application with production keys
- GitHub repository secrets configured (see below)

## Server setup (one-time)

```bash
# Install Docker (official convenience script)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in so group membership applies

# Clone the app
sudo mkdir -p /opt/feedback-platform
sudo chown $USER:$USER /opt/feedback-platform
git clone https://github.com/areeb26/feedback-platform.git /opt/feedback-platform
cd /opt/feedback-platform

# Production environment
cp .env.example .env
nano .env   # fill in production values (see .env.example comments)
```

Required `.env` values on the server:

| Variable | Notes |
|----------|-------|
| `MONGODB_URI` | Atlas connection string |
| `CLERK_SECRET_KEY` | Production `sk_live_...` |
| `CLERK_PUBLISHABLE_KEY` | Production `pk_live_...` |
| `SUPER_ADMIN_USER_IDS` | Comma-separated Clerk user IDs |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://YOUR_DOMAIN/google/callback` |

Optional: Cloudinary, Google OAuth, Places API, OpenAI — enable features as needed.

## Local Docker (smoke test)

```bash
cp .env.example .env
docker compose config          # validate compose file
docker compose up --build -d   # http://localhost:8080
```

## HTTPS with Certbot

### 1. Obtain initial certificate

Edit `docker/nginx.init.conf` and `docker/nginx.prod.conf` — replace `YOUR_DOMAIN` with your hostname (e.g. `app.example.com`).

Build API and web images first:

```bash
cd /opt/feedback-platform
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build api web
```

Stop nginx if it is already bound to port 80, then request a cert with standalone Certbot:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop nginx 2>/dev/null || true

docker run --rm -p 80:80 \
  -v feedback-platform_certbot_certs:/etc/letsencrypt \
  -v feedback-platform_certbot_www:/var/www/certbot \
  certbot/certbot certonly --standalone \
  -d YOUR_DOMAIN \
  --email you@example.com --agree-tos --no-eff-email
```

Alternative (webroot, nginx serving HTTP only):

```bash
# Mount nginx.init.conf (HTTP + acme-challenge, no SSL redirect)
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm \
  -v "$(pwd)/docker/nginx.init.conf:/etc/nginx/conf.d/default.conf:ro" \
  --service-ports nginx

docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d YOUR_DOMAIN \
  --email you@example.com --agree-tos --no-eff-email
```

### 2. Enable HTTPS

Ensure `docker/nginx.prod.conf` has your domain in all `YOUR_DOMAIN` placeholders.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Verify: `curl -I https://YOUR_DOMAIN`

### 3. Certificate renewal

The `certbot` service in `docker-compose.prod.yml` runs `certbot renew` every 12 hours.

Optional host cron (reload nginx after renewal):

```cron
0 3 * * * cd /opt/feedback-platform && docker compose -f docker-compose.yml -f docker-compose.prod.yml exec certbot certbot renew && docker compose -f docker-compose.yml -f docker-compose.prod.yml exec nginx nginx -s reload
```

## GitHub Actions deploy

Workflow: `.github/workflows/deploy.yml`

Triggers on push to `main`:

1. **test** — `npm ci` + `npm test`
2. **deploy** — SSH to VPS, pull latest, rebuild, restart

### Repository secrets

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | VPS public IP or hostname |
| `DEPLOY_USER` | SSH user (e.g. `deploy`) |
| `DEPLOY_SSH_KEY` | Private key (PEM) for that user |
| `DEPLOY_PATH` | App directory on server (e.g. `/opt/feedback-platform`) |

Generate a deploy key:

```bash
ssh-keygen -t ed25519 -f deploy_key -N ""
# Add deploy_key.pub to ~/.ssh/authorized_keys on the VPS
# Add deploy_key contents to GitHub secret DEPLOY_SSH_KEY
```

Ensure the deploy user can run Docker without sudo and has write access to `DEPLOY_PATH`.

## Manual deploy

```bash
./scripts/deploy.sh
```

On the VPS with production overrides:

```bash
COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml ./scripts/deploy.sh
```

## Troubleshooting

| Symptom | Check |
|---------|-------|
| 502 on `/api` | `docker compose logs api` — MongoDB URI, Clerk keys |
| Blank page | `docker compose logs nginx` — web image built? |
| SSL errors | Certs in `certbot_certs` volume; domain in nginx.prod.conf |
| Deploy fails | GitHub Actions logs; SSH key and `DEPLOY_PATH` |
