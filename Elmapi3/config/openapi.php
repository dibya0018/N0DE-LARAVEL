<?php

return [
    /*
    |--------------------------------------------------------------------------
    | OpenAPI Documentation Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains the configuration for OpenAPI/Swagger documentation
    | generation and display.
    |
    */

    'title' => env('OPENAPI_TITLE', 'ElmapiCMS Content API'),
    'description' => env('OPENAPI_DESCRIPTION', 'A headless CMS API for managing content, assets, and collections'),
    'version' => env('OPENAPI_VERSION', '1.0.0'),
    'contact_email' => env('OPENAPI_CONTACT_EMAIL', 'support@elmapicms.com'),
    'contact_name' => env('OPENAPI_CONTACT_NAME', 'API Support'),
    'license_name' => env('OPENAPI_LICENSE_NAME', 'Proprietary'),
    'license_url' => env('OPENAPI_LICENSE_URL', 'https://elmapicms.com/license'),
    
    /*
    |--------------------------------------------------------------------------
    | Server Configuration
    |--------------------------------------------------------------------------
    |
    | Define the server URLs for different environments
    |
    */
    'servers' => [
        'local' => [
            'url' => 'http://localhost:8000',
            'description' => 'Local development server'
        ],
        'production' => [
            'url' => env('APP_URL', 'https://elmapi3.test'),
            'description' => 'Production server'
        ]
    ],
    
    /*
    |--------------------------------------------------------------------------
    | Scan Paths
    |--------------------------------------------------------------------------
    |
    | Paths to scan for OpenAPI annotations
    |
    */
    'scan_paths' => [
        app_path('Http/Controllers/Api'),
    ],
    
    /*
    |--------------------------------------------------------------------------
    | Security Schemes
    |--------------------------------------------------------------------------
    |
    | Define the security schemes used by the API
    |
    */
    'security_schemes' => [
        'bearerAuth' => [
            'type' => 'http',
            'scheme' => 'bearer',
            'bearerFormat' => 'JWT',
            'description' => 'Use your API token as bearer token'
        ]
    ],
    
    /*
    |--------------------------------------------------------------------------
    | Tags
    |--------------------------------------------------------------------------
    |
    | Define the tags used to group API endpoints
    |
    */
    'tags' => [
        [
            'name' => 'Projects',
            'description' => 'Project information and configuration'
        ],
        [
            'name' => 'Collections',
            'description' => 'Collection schema and field definitions'
        ],
        [
            'name' => 'Content',
            'description' => 'Content entry management operations'
        ],
        [
            'name' => 'Assets',
            'description' => 'File and asset management operations'
        ]
    ]
]; 