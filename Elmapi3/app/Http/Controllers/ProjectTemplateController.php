<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use App\Models\ProjectTemplate;
use Illuminate\Http\Request;
use App\Models\Project;
use App\Services\ProjectTemplateBuilder;

class ProjectTemplateController extends Controller
{
    /**
     * Return list of available project templates stored in the database
     */
    public function index(): JsonResponse
    {
        $list = ProjectTemplate::select('slug', 'name', 'description', 'has_demo_data')->get();

        return response()->json($list);
    }

    /**
     * Store a new project template generated from an existing project.
     */
    public function storeFromProject(Request $request, Project $project): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'slug' => 'required|string|max:100',
            'description' => 'nullable|string',
            'include_demo_data' => 'sometimes|boolean',
        ]);

        // Ensure slug uniqueness
        if (ProjectTemplate::where('slug', $validated['slug'])->exists()) {
            return response()->json(['message' => 'Slug already exists'], 422);
        }

        $templateArr = ProjectTemplateBuilder::build(
            $project,
            $validated['slug'],
            $validated['name'],
            $validated['description'] ?? null,
            $validated['include_demo_data'] ?? false,
        );

        $template = ProjectTemplate::create([
            'name' => $templateArr['name'],
            'slug' => $templateArr['slug'],
            'description' => $templateArr['description'],
            'has_demo_data' => $templateArr['has_demo_data'] ?? false,
            'data' => $templateArr,
        ]);

        return response()->json([
            'message' => 'Template created',
            'template' => $template->only(['id','slug','name','description','has_demo_data']),
        ], 201);
    }
} 