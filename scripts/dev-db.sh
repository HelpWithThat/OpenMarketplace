#!/usr/bin/env bash
# Start local Prisma Postgres for this app.
# Run from any directory. Leaves the process in the foreground (Ctrl+C to stop).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Starting local Prisma Postgres via: npx prisma dev"
echo "When it prints DATABASE_URL, put that value in .env (direct postgres:// host/port)."
echo "Then in another terminal: npx prisma migrate reset --force"
exec npx prisma dev
