#!/usr/bin/env bash
set -e

echo "🚀 [ReconGuard] Initializing Production Environment..."

# 1. Storage Symlink
echo "📦 Creating storage link..."
php artisan storage:link --force || true

# 2. Performance Caching
echo "⚡ Optimizing route, config, and view caches..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# 3. Database Migration
echo "🗄️ Executing database migrations..."
php artisan migrate --force

# 4. Self-Healing Demonstration Seeder
echo "🌱 Verifying demo dataset existence..."
USER_COUNT=$(php artisan tinker --execute="echo \App\Models\User::count();")
if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    echo "⚠️ Database is empty. Seeding demo accounts, bank statements, and sample invoices..."
    php artisan db:seed --force
    echo "✓ Demo dataset seeded successfully."
else
    echo "✓ Database already populated ($USER_COUNT users found). Skipping seed."
fi

# 5. Configure Apache port from PORT environment variable
PORT="${PORT:-8080}"
echo "🌐 Configuring Apache port to ${PORT}..."
sed -i "s/80/${PORT}/g" /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

# 6. Start Apache Foreground Server
echo "🔥 [ReconGuard] Server live on 0.0.0.0:${PORT}"
exec apache2-foreground
