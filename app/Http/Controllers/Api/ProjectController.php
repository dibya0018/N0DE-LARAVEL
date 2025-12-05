<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use OpenApi\Annotations as OA;

class ProjectController extends Controller
{
    /**
     * Display the specified project with its structure for the Content API.
     *
     * The endpoint is publicly accessible if the project has public_api enabled. Otherwise a
     * valid bearer token that belongs to the requested project is required.
     *
     * @OA\Get(
     *     path="/api",
     *     summary="Get project information",
     *     description="Retrieve project configuration and structure information",
     *     tags={"Projects"},
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
     *         description="Project information retrieved successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="uuid", type="string", example="550e8400-e29b-41d4-a716-446655440000"),
     *             @OA\Property(property="name", type="string", example="My Project"),
     *             @OA\Property(property="description", type="string", example="A headless CMS project"),
     *             @OA\Property(property="default_locale", type="string", example="en"),
     *             @OA\Property(property="locales", type="array", @OA\Items(type="string"), example={"en", "es", "fr"})
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
     *         description="Project not found"
     *     )
     * )
     *
     * @param  Request  $request
     * @param  string   $uuid
     * @return \Illuminate\Http\JsonResponse|ProjectResource
     */
    public function show(Request $request)
    {
        $project = $request->attributes->get('project');

        if($request->has('with')){
            // /api?with=collections,fields
            $with = explode(',', $request->input('with'));
            if (in_array('collections', $with)) {
                $project->load('collections');
            }
            if (in_array('fields', $with)) {
                $project->load('collections.fields');
            }
        }

        // check if the token has the read ability
        if (!$project->public_api && !auth('sanctum')->user()->tokenCan('read')) {
            return response()->json(['message' => 'API token does\'nt have the right abilities!'], 403);
        }

        return new ProjectResource($project);
    }
} 