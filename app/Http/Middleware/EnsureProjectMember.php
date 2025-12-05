<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureProjectMember
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $project = $request->route('project');

        if (!$project) {
            return $next($request);
        }

        if ($user->can('access_all_projects') || $user->projects()->where('projects.id', $project->id)->exists()) {
            return $next($request);
        }

        abort(403);
    }
} 