# Deployment Fix Guide

## Problem
The autoloader references Laravel framework files that don't exist, causing deployment to fail with:
```
Failed opening required '/var/www/html/vendor/laravel/framework/src/Illuminate/Events/functions.php'
```

## Root Cause
This happens when Composer packages aren't fully extracted during installation, but the autoloader is generated with references to files that should exist.

## Solution (Choose One)

### ⚡ RECOMMENDED: Use Build Script
In your deployment platform's **Build Command**, use:

```bash
bash build.sh
```

Or if you prefer inline commands:

```bash
composer install --no-scripts --prefer-dist --optimize-autoloader && \
php fix-autoloader-aggressive.php && \
composer dump-autoload --optimize
```

### Option 2: Pre-Deploy Script
Add this as a **pre-deploy** or **before deploy commands** step:

```bash
php fix-autoloader-aggressive.php
```

### Option 3: Modify Install Process
If you can't modify build commands, ensure your install process is:

```bash
# Step 1: Install without scripts
composer install --no-scripts --no-interaction --prefer-dist

# Step 2: Fix autoloader
php fix-autoloader-aggressive.php

# Step 3: Regenerate autoloader
composer dump-autoload --optimize

# Step 4: Now run your deploy commands
```

## Why This Happens
1. Composer install completes but packages aren't fully extracted
2. Autoloader is generated with references to files that don't exist
3. When artisan tries to load, it fails on missing files

## Verification
After running the fix, verify with:

```bash
php -r "require 'vendor/autoload.php'; echo 'Autoloader OK\n';"
php artisan --version
```

## Alternative: Use Safe Autoloader
If fixes don't work, you can temporarily use the safe autoloader wrapper by modifying `artisan`:

Change line 10 from:
```php
require __DIR__.'/vendor/autoload.php';
```

To:
```php
require __DIR__.'/vendor/autoload-safe.php';
```

**Note:** This is a temporary workaround. The proper fix is to ensure packages are fully installed.

