#!/bin/bash
set -e

# ── MySQL ──────────────────────────────────────────────────────────────────────
mkdir -p /run/mysqld
chown -R mysql:mysql /run/mysqld 2>/dev/null || true

mysqld_safe --datadir=/var/lib/mysql &
MYSQL_PID=$!

echo "Waiting for MySQL..."
for i in {1..60}; do
  if mysqladmin ping --silent 2>/dev/null; then
    echo "MySQL is ready."
    break
  fi
  sleep 1
done

# Create the elections database if it doesn't exist
mysql -u root -e "CREATE DATABASE IF NOT EXISTS elections CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true

# ── Backend (Django) ───────────────────────────────────────────────────────────
cd /app/backend
pip install -r requirements.txt -q

# Run migrations
python manage.py migrate --noinput

# Start Django development server
python manage.py runserver 0.0.0.0:3001 &

# ── Frontend (Next.js) ─────────────────────────────────────────────────────────
cd /app/frontend
npm install --prefer-offline --silent 2>/dev/null || npm install

# Start Next.js dev server
npm run build && npx next start --port 3000 --hostname 0.0.0.0 &

echo "All servers started."
