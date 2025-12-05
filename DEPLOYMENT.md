# Deployment Fix Guide

## Problem
The autoloader references Laravel framework files that don't exist, causing deployment to fail with:
```
Failed opening required '/var/www/html/vendor/laravel/framework/src/Illuminate/Events/functions.php'
```

## Solution

### Option 1: Run Fix Script Before Deploy Commands
In your deployment platform's build settings, add this as a pre-deploy command:

```bash
php fix-deployment.php
```

### Option 2: Modify Build Command
Replace your build command with:

```bash
composer install --no-scripts --prefer-dist --optimize-autoloader && \
composer dump-autoload --optimize && \
php fix-deployment.php && \
# Your existing deploy commands here
```

### Option 3: Use Composer Script
The `composer.json` now includes a `pre-deploy` script. Run:

```bash
composer run-script pre-deploy
```

## Root Cause
This happens when:
1. Composer packages aren't fully extracted during installation
2. The autoloader is generated before all packages are installed
3. There's a race condition in the deployment process

## Verification
After running the fix, verify with:

```bash
php -r "require 'vendor/autoload.php'; echo 'Autoloader OK';"
php artisan --version
```

