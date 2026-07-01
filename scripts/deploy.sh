#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILES="${COMPOSE_FILE:-docker-compose.yml}"
IFS=':' read -ra FILES <<< "$COMPOSE_FILES"
COMPOSE_ARGS=()
for f in "${FILES[@]}"; do
  COMPOSE_ARGS+=(-f "$f")
done

echo "==> Pulling latest changes"
git pull --ff-only origin main

echo "==> Building images"
docker compose "${COMPOSE_ARGS[@]}" build

echo "==> Starting stack"
docker compose "${COMPOSE_ARGS[@]}" up -d

echo "==> Status"
docker compose "${COMPOSE_ARGS[@]}" ps
