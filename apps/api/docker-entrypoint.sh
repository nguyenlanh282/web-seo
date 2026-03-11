#!/bin/bash
set -e

# docker-compose depends_on with healthcheck ensures PostgreSQL is ready
# before this container starts — no polling loop needed.

echo "▶ Running database migrations..."
npx prisma migrate deploy

echo "▶ Starting API server..."
exec "$@"
