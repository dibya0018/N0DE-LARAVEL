<?php

/**
 * Fix Laravel 8.5 deprecation warning in database config
 * This script replaces PDO::MYSQL_ATTR_SSL_CA with \Pdo\Mysql::ATTR_SSL_CA
 * in the Laravel framework's database config file.
 */

$file = __DIR__ . '/vendor/laravel/framework/config/database.php';

if (!file_exists($file)) {
    echo "Laravel database config file not found. Skipping fix.\n";
    exit(0);
}

$content = file_get_contents($file);
$originalContent = $content;

// Replace the deprecated constant
$content = str_replace('PDO::MYSQL_ATTR_SSL_CA', '\\Pdo\\Mysql::ATTR_SSL_CA', $content);

if ($content !== $originalContent) {
    file_put_contents($file, $content);
    echo "Fixed Laravel database config deprecation warnings.\n";
} else {
    echo "No changes needed in Laravel database config.\n";
}

