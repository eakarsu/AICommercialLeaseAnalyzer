#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"
[ -f "$root/.env" ] || { echo "Missing .env (copy .env.example)" >&2; exit 1; }
[ -d "$root/backend/node_modules" ] && [ -d "$root/frontend/node_modules" ] || { echo "Dependencies missing; run scripts/bootstrap.sh" >&2; exit 1; }
set -a
. "$root/.env"
set +a

backend_port="${BACKEND_PORT:-4001}"
frontend_port="${FRONTEND_PORT:-3000}"
if lsof -nP -iTCP:"$backend_port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Backend port $backend_port is already in use." >&2
  exit 1
fi
if lsof -nP -iTCP:"$frontend_port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Frontend port $frontend_port is already in use." >&2
  exit 1
fi

if [[ "${MIGRATE_ON_START:-false}" == "true" ]]; then
  [[ "${ALLOW_SCHEMA_MIGRATION:-}" == "1" || "${ALLOW_SCHEMA_MIGRATION:-}" == "true" ]] || {
    echo "MIGRATE_ON_START requires ALLOW_SCHEMA_MIGRATION=1." >&2
    exit 1
  }
  bash "$root/scripts/migrate.sh"
  node "$root/backend/src/scripts/create-admin.js"
fi

(cd "$root/backend" && npm start) & backend_pid=$!
(cd "$root/frontend" && BROWSER=none PORT="$frontend_port" REACT_APP_API_URL="http://127.0.0.1:$backend_port/api" ./node_modules/.bin/react-scripts start) & frontend_pid=$!
cleanup(){ kill "$backend_pid" "$frontend_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
wait "$backend_pid" "$frontend_pid"
