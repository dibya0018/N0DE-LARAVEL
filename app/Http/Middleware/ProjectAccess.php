<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\Project;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ProjectAccess
{
    /**
     * Resolve project from header and enforce API access permissions.
     *
     * Expects header: project-id
     */
    public function handle(Request $request, Closure $next): Response
    {
        $uuid = $request->header('project-id');

        if (! $uuid) {
            return response()->json(['message' => 'Project header missing.'], 400);
        }

        $project = Project::where('uuid', $uuid)->first();

        if (! $project) {
            return response()->json(['message' => 'Project not found.'], 404);
        }

        // If project is not public, ensure Sanctum authentication
        if (! $project->public_api) {
            if (! auth('sanctum')->check()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }

            $tokenable = auth('sanctum')->user();
            $currentToken = $request->user()?->currentAccessToken();

            if (! ($tokenable instanceof Project) || $tokenable->id !== $project->id) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
        }

        // Share the resolved project for downstream usage
        $request->attributes->set('project', $project);

        return $next($request);
    }
} 