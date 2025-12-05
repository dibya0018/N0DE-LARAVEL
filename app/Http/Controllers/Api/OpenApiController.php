<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use OpenApi\Generator;
use OpenApi\Annotations as OA;

/**
 * @OA\Info(
 *     version="1.0.0",
 *     title="Elmapi3 Content API",
 *     description="A headless CMS API for managing content, assets, and collections",
 *     @OA\Contact(
 *         email="support@elmapicms.com",
 *         name="API Support"
 *     ),
 *     @OA\License(
 *         name="Proprietary",
 *         url="https://elmapicms.com/license"
 *     )
 * )
 * 
 * @OA\Server(
 *     url="http://localhost:8000",
 *     description="Local development server"
 * )
 * 
 * @OA\Server(
 *     url="https://elmapi3.test/api",
 *     description="Production server"
 * )
 * 
 * @OA\SecurityScheme(
 *     securityScheme="bearerAuth",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     description="Use your API token as bearer token"
 * )
 * 
 * @OA\Parameter(
 *     name="project-id",
 *     in="header",
 *     required=true,
 *     description="Project identifier (UUID)",
 *     @OA\Schema(type="string", format="uuid", example="550e8400-e29b-41d4-a716-446655440000")
 * )
 * 
 * @OA\Tag(
 *     name="Projects",
 *     description="Project information and configuration"
 * )
 * 
 * @OA\Tag(
 *     name="Collections",
 *     description="Collection schema and field definitions"
 * )
 * 
 * @OA\Tag(
 *     name="Content",
 *     description="Content entry management operations"
 * )
 * 
 * @OA\Tag(
 *     name="Assets",
 *     description="File and asset management operations"
 * )
 */
class OpenApiController extends Controller
{
    /**
     * Generate and return OpenAPI documentation dynamically
     */
    public function generate()
    {
        try {
            // Try scanning the entire API directory first
            $openapi = Generator::scan([app_path('Http/Controllers/Api')]);
            
            $json = json_decode($openapi->toJson(), true);
            
            // Override all configuration values with dynamic values from config
            $json['info'] = [
                'title' => config('openapi.title'),
                'description' => config('openapi.description'),
                'version' => config('openapi.version'),
                'contact' => [
                    'name' => config('openapi.contact_name'),
                    'email' => config('openapi.contact_email')
                ],
                'license' => [
                    'name' => config('openapi.license_name'),
                    'url' => config('openapi.license_url')
                ]
            ];
            
            // Override server URLs with dynamic values from config
            $json['servers'] = [
                [
                    'url' => config('openapi.servers.local.url'),
                    'description' => config('openapi.servers.local.description')
                ],
                [
                    'url' => config('openapi.servers.production.url'),
                    'description' => config('openapi.servers.production.description')
                ]
            ];
            
            // Override security schemes with dynamic values from config
            $json['components']['securitySchemes'] = config('openapi.security_schemes');
            
            // Override tags with dynamic values from config
            $json['tags'] = config('openapi.tags');
            
            return response()->json($json, 200, [
                'Content-Type' => 'application/json',
                'Cache-Control' => 'no-cache, no-store, must-revalidate'
            ]);
            
        } catch (\Exception $e) {
            // Log the error for debugging
            \Log::error('OpenAPI generation failed: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'error' => 'Failed to generate OpenAPI documentation',
                'message' => $e->getMessage(),
                'note' => 'Check controller annotations and config/openapi.php',
                'debug' => [
                    'scan_path' => app_path('Http/Controllers/Api'),
                    'files_exist' => [
                        'ProjectController' => file_exists(app_path('Http/Controllers/Api/ProjectController.php')),
                        'CollectionController' => file_exists(app_path('Http/Controllers/Api/CollectionController.php')),
                        'AssetController' => file_exists(app_path('Http/Controllers/Api/AssetController.php')),
                        'ContentController' => file_exists(app_path('Http/Controllers/Api/ContentController.php')),
                    ]
                ]
            ], 500);
        }
    }
    
    /**
     * Serve Swagger UI
     */
    public function ui()
    {
        return view('swagger-ui');
    }
} 