<?php

/**
 * Safe artisan wrapper that ensures autoloader is valid before running commands
 */

// Check if autoloader exists and is valid
$vendorDir = __DIR__ . '/vendor';
$autoloadFile = $vendorDir . '/autoload.php';
$eventsFunctionsFile = $vendorDir . '/laravel/framework/src/Illuminate/Events/functions.php';

if (!file_exists($autoloadFile)) {
    fwrite(STDERR, "ERROR: vendor/autoload.php not found. Run 'composer install' first.\n");
    exit(1);
}

// Check if critical Laravel files exist
if (!file_exists($eventsFunctionsFile)) {
    fwrite(STDERR, "WARNING: Laravel framework files appear incomplete.\n");
    fwrite(STDERR, "Attempting to fix...\n");
    
    // Try to regenerate autoloader
    $output = [];
    $return = 0;
    exec('composer dump-autoload --optimize 2>&1', $output, $return);
    
    if ($return !== 0 || !file_exists($eventsFunctionsFile)) {
        fwrite(STDERR, "ERROR: Laravel framework files are missing.\n");
        fwrite(STDERR, "Please run: composer install --no-scripts && composer dump-autoload\n");
        exit(1);
    }
}

// Now try to load the autoloader
try {
    require $autoloadFile;
} catch (Throwable $e) {
    fwrite(STDERR, "ERROR: Autoloader is broken: " . $e->getMessage() . "\n");
    fwrite(STDERR, "Attempting to regenerate autoloader...\n");
    
    exec('composer dump-autoload --optimize 2>&1', $output, $return);
    if ($return === 0) {
        // Try again
        try {
            require $autoloadFile;
        } catch (Throwable $e2) {
            fwrite(STDERR, "ERROR: Autoloader still broken after regeneration.\n");
            fwrite(STDERR, "Please run: composer install --no-scripts && composer dump-autoload\n");
            exit(1);
        }
    } else {
        fwrite(STDERR, "ERROR: Failed to regenerate autoloader.\n");
        exit(1);
    }
}

// If we get here, autoloader is valid, so run the actual artisan command
require __DIR__ . '/artisan';

