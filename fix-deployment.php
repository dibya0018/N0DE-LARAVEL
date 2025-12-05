<?php

/**
 * Deployment fix script
 * Ensures all Composer packages are properly installed and autoloader is valid
 */

echo "Checking Composer installation...\n";

$vendorDir = __DIR__ . '/vendor';
$autoloadFile = $vendorDir . '/autoload.php';
$laravelFrameworkDir = $vendorDir . '/laravel/framework';
$eventsFunctionsFile = $vendorDir . '/laravel/framework/src/Illuminate/Events/functions.php';

// Check if vendor directory exists
if (!is_dir($vendorDir)) {
    echo "ERROR: vendor directory not found. Run 'composer install' first.\n";
    exit(1);
}

// Check if Laravel framework is installed
if (!is_dir($laravelFrameworkDir)) {
    echo "ERROR: Laravel framework not found in vendor directory.\n";
    echo "Running 'composer install' to fix this...\n";
    $output = [];
    $return = 0;
    exec('composer install --no-interaction --prefer-dist 2>&1', $output, $return);
    if ($return !== 0) {
        echo "ERROR: composer install failed:\n" . implode("\n", $output) . "\n";
        exit(1);
    }
    echo "Composer install completed.\n";
}

// Check if critical Laravel files exist
if (!file_exists($eventsFunctionsFile)) {
    echo "WARNING: Laravel framework files appear incomplete.\n";
    echo "Regenerating autoloader...\n";
    
    // Try to regenerate autoloader
    $output = [];
    $return = 0;
    exec('composer dump-autoload --optimize 2>&1', $output, $return);
    
    if ($return !== 0) {
        echo "WARNING: Could not regenerate autoloader:\n" . implode("\n", $output) . "\n";
    } else {
        echo "Autoloader regenerated.\n";
    }
    
    // Check again
    if (!file_exists($eventsFunctionsFile)) {
        echo "ERROR: Laravel framework files still missing after regeneration.\n";
        echo "This usually means packages weren't fully extracted.\n";
        echo "Try running: composer install --no-scripts && composer dump-autoload\n";
        exit(1);
    }
}

// Verify autoloader can be loaded
if (file_exists($autoloadFile)) {
    // First, check if the autoloader references files that don't exist
    // by checking the autoload_files.php
    $autoloadFiles = $vendorDir . '/composer/autoload_files.php';
    if (file_exists($autoloadFiles)) {
        $files = require $autoloadFiles;
        $missingFiles = [];
        foreach ($files as $file) {
            if (!file_exists($file)) {
                $missingFiles[] = $file;
            }
        }
        
        if (!empty($missingFiles)) {
            echo "WARNING: Autoloader references " . count($missingFiles) . " missing files.\n";
            echo "Regenerating autoloader...\n";
            exec('composer dump-autoload --optimize 2>&1', $output, $return);
            if ($return !== 0) {
                echo "WARNING: Could not regenerate autoloader, but continuing...\n";
            } else {
                echo "Autoloader regenerated.\n";
            }
        }
    }
    
    // Now try to load the autoloader
    try {
        // Suppress errors temporarily to check if it loads
        $oldErrorReporting = error_reporting(E_ALL & ~E_WARNING & ~E_ERROR);
        @require $autoloadFile;
        error_reporting($oldErrorReporting);
        echo "Autoloader loaded successfully.\n";
    } catch (Throwable $e) {
        error_reporting($oldErrorReporting ?? E_ALL);
        echo "ERROR: Autoloader is broken: " . $e->getMessage() . "\n";
        echo "Attempting to fix by reinstalling packages...\n";
        
        // Try composer install --no-scripts to re-extract packages
        exec('composer install --no-scripts --no-interaction --prefer-dist 2>&1', $output, $return);
        if ($return === 0) {
            // Then regenerate autoloader
            exec('composer dump-autoload --optimize 2>&1', $output2, $return2);
            if ($return2 === 0) {
                echo "Packages reinstalled and autoloader regenerated.\n";
                // Try loading again
                try {
                    require $autoloadFile;
                    echo "Autoloader now works correctly.\n";
                } catch (Throwable $e2) {
                    echo "ERROR: Autoloader still broken after fix attempt.\n";
                    exit(1);
                }
            } else {
                echo "ERROR: Failed to regenerate autoloader after reinstall.\n";
                exit(1);
            }
        } else {
            echo "ERROR: Failed to reinstall packages.\n";
            exit(1);
        }
    }
} else {
    echo "ERROR: vendor/autoload.php not found.\n";
    exit(1);
}

echo "Deployment check passed. All files are in place.\n";
exit(0);

