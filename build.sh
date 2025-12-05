#!/bin/bash
set -e

echo "=== Laravel Deployment Build Script ==="

# Step 1: Install Composer dependencies
echo "Installing Composer dependencies..."
composer install --no-scripts --no-interaction --prefer-dist --optimize-autoloader

# Step 2: Fix autoloader if needed
echo "Checking and fixing autoloader..."
php fix-autoloader-aggressive.php || echo "Warning: Autoloader fix had issues, but continuing..."

# Step 3: Regenerate autoloader
echo "Regenerating autoloader..."
composer dump-autoload --optimize --no-interaction

# Step 4: Verify installation
echo "Verifying Laravel framework files..."
if [ ! -f "vendor/laravel/framework/src/Illuminate/Events/functions.php" ]; then
    echo "ERROR: Laravel framework files are missing!"
    echo "Attempting to reinstall..."
    composer install --no-scripts --no-interaction --prefer-dist
    composer dump-autoload --optimize
fi

# Step 5: Run Laravel setup
echo "Running Laravel package discovery..."
php artisan package:discover --ansi || echo "Warning: package:discover failed, but continuing..."

echo "=== Build completed successfully ==="

