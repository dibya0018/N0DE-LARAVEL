@echo off
setlocal

echo === Laravel Deployment Build Script ===

REM Step 1: Install Composer dependencies
echo Installing Composer dependencies...
composer install --no-scripts --no-interaction --prefer-dist --optimize-autoloader
if errorlevel 1 (
    echo ERROR: Composer install failed
    exit /b 1
)

REM Step 2: Fix autoloader if needed
echo Checking and fixing autoloader...
php fix-autoloader-aggressive.php
if errorlevel 1 (
    echo Warning: Autoloader fix had issues, but continuing...
)

REM Step 3: Regenerate autoloader
echo Regenerating autoloader...
composer dump-autoload --optimize --no-interaction
if errorlevel 1 (
    echo ERROR: Failed to regenerate autoloader
    exit /b 1
)

REM Step 4: Verify installation
echo Verifying Laravel framework files...
if not exist "vendor\laravel\framework\src\Illuminate\Events\functions.php" (
    echo ERROR: Laravel framework files are missing!
    echo Attempting to reinstall...
    composer install --no-scripts --no-interaction --prefer-dist
    composer dump-autoload --optimize
)

REM Step 5: Run Laravel setup
echo Running Laravel package discovery...
php artisan package:discover --ansi
if errorlevel 1 (
    echo Warning: package:discover failed, but continuing...
)

echo === Build completed successfully ===

