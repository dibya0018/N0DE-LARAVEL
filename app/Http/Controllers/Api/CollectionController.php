<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use Illuminate\Http\Request;
use OpenApi\Annotations as OA;


class CollectionController extends Controller
{
    /**
     * List collections for the current project with minimal meta.
     * Route: GET /api/collections
     * 
     * @OA\Get(
     *     path="/api/collections",
     *     summary="List collections",
     *     description="Get all collections for the current project",
     *     tags={"Collections"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="project-id",
     *         in="header",
     *         required=true,
     *         description="Project identifier (UUID)",
     *         @OA\Schema(type="string", format="uuid", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Collections retrieved successfully",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(
     *                 type="object",
     *                 @OA\Property(property="uuid", type="string", example="550e8400-e29b-41d4-a716-446655440000"),
     *                 @OA\Property(property="name", type="string", example="Blog Posts"),
     *                 @OA\Property(property="slug", type="string", example="blog-posts"),
     *                 @OA\Property(property="is_singleton", type="boolean", example=false),
     *                 @OA\Property(property="created_at", type="string", format="date-time"),
     *                 @OA\Property(property="updated_at", type="string", format="date-time")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing API token"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - API token doesn't have required permissions"
     *     )
     * )
     */
    public function index(Request $request)
    {
        $project = $request->attributes->get('project');

        $collections = Collection::where('project_id', $project->id)
            ->orderBy('order')
            ->get();

        return \App\Http\Resources\CollectionResource::collection($collections);
    }

    /**
     * Return a single collection definition (including its fields).
     * Route: GET /api/collections/{collection}
     * 
     * @OA\Get(
     *     path="/api/collections/{collection}",
     *     summary="Get collection details",
     *     description="Get detailed information about a specific collection including its fields",
     *     tags={"Collections"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="project-id",
     *         in="header",
     *         required=true,
     *         description="Project identifier (UUID)",
     *         @OA\Schema(type="string", format="uuid", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *     @OA\Parameter(
     *         name="collection",
     *         in="path",
     *         required=true,
     *         description="Collection slug",
     *         @OA\Schema(type="string", example="blog-posts")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Collection details retrieved successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="uuid", type="string", example="550e8400-e29b-41d4-a716-446655440000"),
     *             @OA\Property(property="name", type="string", example="Blog Posts"),
     *             @OA\Property(property="slug", type="string", example="blog-posts"),
     *             @OA\Property(property="is_singleton", type="boolean", example=false),
     *             @OA\Property(property="fields", type="array", @OA\Items(
     *                 type="object",
     *                 @OA\Property(property="type", type="string", example="text"),
     *                 @OA\Property(property="label", type="string", example="Title"),
     *                 @OA\Property(property="name", type="string", example="title"),
     *                 @OA\Property(property="description", type="string", example="The post title"),
     *                 @OA\Property(property="placeholder", type="string", example="Enter title..."),
     *                 @OA\Property(property="options", type="object", example={}),
     *                 @OA\Property(property="validations", type="object", example={})
     *             )),
     *             @OA\Property(property="created_at", type="string", format="date-time"),
     *             @OA\Property(property="updated_at", type="string", format="date-time")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing API token"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - API token doesn't have required permissions"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Collection not found"
     *     )
     * )
     */
    public function show(Request $request, string $collection)
    {
        $project = $request->attributes->get('project');

        $collection = Collection::with('fields')
            ->where('project_id', $project->id)
            ->where('slug', $collection)
            ->first();

        if (!$collection) {
            return response()->json(['message' => 'Collection not found.'], 404);
        }

        return new \App\Http\Resources\CollectionResource($collection);
    }
} 