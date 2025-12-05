<?php

/**
 * Safe post-autoload-dump handler that checks for required files before executing
 */

$vendorDir = __DIR__ . '/vendor';
$autoloadFile = $vendorDir . '/autoload.php';
$composerScriptsFile = $vendorDir . '/laravel/framework/src/Illuminate/Foundation/ComposerScripts.php';
$eventsFunctionsFile = $vendorDir . '/laravel/framework/src/Illuminate/Events/functions.php';

// Check if autoload file exists
if (!file_exists($autoloadFile)) {
    echo "Warning: vendor/autoload.php not found, skipping post-autoload-dump\n";
    exit(0);
}

// Check if Laravel framework is installed (check for a critical file)
if (!file_exists($eventsFunctionsFile)) {
    echo "Warning: Laravel framework files not found, skipping ComposerScripts\n";
    exit(0);
}

// Check if ComposerScripts file exists
if (!file_exists($composerScriptsFile)) {
    echo "Warning: ComposerScripts file not found, skipping post-autoload-dump\n";
    exit(0);
}

// Try to load autoloader with error suppression
$oldErrorReporting = error_reporting(E_ALL & ~E_WARNING & ~E_ERROR);
try {
    @require $autoloadFile;
} catch (Throwable $e) {
    error_reporting($oldErrorReporting);
    echo "Warning: Failed to load autoloader: " . $e->getMessage() . "\n";
    exit(0);
}
error_reporting($oldErrorReporting);

// Check if class exists after autoloading
if (!class_exists('Illuminate\Foundation\ComposerScripts', false)) {
    // Try to require the file directly
    if (file_exists($composerScriptsFile)) {
        require_once $composerScriptsFile;
    }
    
    if (!class_exists('Illuminate\Foundation\ComposerScripts', false)) {
        echo "Warning: Illuminate\\Foundation\\ComposerScripts class not found\n";
        exit(0);
    }
}

// Execute the post-autoload-dump method
try {
    Illuminate\Foundation\ComposerScripts::postAutoloadDump();
} catch (Throwable $e) {
    echo "Warning: postAutoloadDump failed: " . $e->getMessage() . "\n";
    exit(0);
}

