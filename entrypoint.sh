#!/usr/bin/env sh
set -e

# FORCE_DB_SYNC=1 — overwrite volume DB and thumbnails with the baked-in copy.
# Set temporarily in Railway env vars to push your latest local data, then remove.
if [ "${FORCE_DB_SYNC}" = "1" ]; then
  echo "FORCE_DB_SYNC=1 — overwriting volume data from image..."
  cp -f /app/data-seed/flowcore.db /app/data/flowcore.db
  rm -rf /app/data/thumbnails/*
  cp -r /app/data-seed/thumbnails/* /app/data/thumbnails/ 2>/dev/null || true
  echo "Sync complete."
else
  # If no DB exists on the volume, copy seed data from the image
  if [ ! -f /app/data/flowcore.db ]; then
    echo "No database found — seeding from baked-in data..."
    cp /app/data-seed/flowcore.db /app/data/flowcore.db
  fi

  # Copy thumbnails if the directory is empty
  if [ -z "$(ls -A /app/data/thumbnails 2>/dev/null)" ]; then
    echo "Seeding thumbnails..."
    cp -r /app/data-seed/thumbnails/* /app/data/thumbnails/ 2>/dev/null || true
  fi
fi

echo "Starting FlowCore..."
exec "$@"
