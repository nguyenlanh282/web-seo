#!/bin/bash
set -e

# Wait for PostgreSQL
echo "Waiting for PostgreSQL to be ready..."
until npx prisma db push --accept-data-loss 2>/dev/null; do
  echo "PostgreSQL is not ready yet - waiting..."
  sleep 2
done

# Run migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Run seed if not exists
if [ "$NODE_ENV" != "production" ]; then
  echo "Running seed script..."
  npx prisma db seed
fi

# Start the app
echo "Starting API server..."
exec "$@"
