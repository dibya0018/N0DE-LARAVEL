<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class ProjectSettingsController extends Controller
{
    /**
     * Show main project settings page.
     */
    public function project(Project $project)
    {
        return Inertia::render('Projects/Settings/Project', [
            'project' => $project,
        ]);
    }

    /**
     * Placeholder for localization settings.
     */
    public function localization(Project $project)
    {
        return Inertia::render('Projects/Settings/Localization', [
            'project' => $project,
        ]);
    }

    /**
     * Placeholder for users & roles settings.
     */
    public function userAccess(Project $project)
    {
        $project->load(['members.roles']);

        return Inertia::render('Projects/Settings/UserAccess', [
            'project' => $project,
        ]);
    }

    /**
     * Placeholder for API access settings.
     */
    public function apiAccess(Project $project)
    {
        return Inertia::render('Projects/Settings/APIAccess', [
            'project' => $project,
            'tokens'  => $project->tokens()->select('id','name','abilities','last_used_at','created_at')->orderBy('created_at','desc')->get(),
        ]);
    }

    /**
     * Placeholder for webhooks settings.
     */
    public function webhooks(Project $project)
    {
        $project->load(['collections:id,project_id,name']);

        return Inertia::render('Projects/Settings/Webhooks', [
            'project' => $project,
        ]);
    }

    /* ------------------------ Locale management APIs --------------------- */

    public function addLocale(Request $request, Project $project)
    {
        $validated = $request->validate([
            'locale' => 'required|string|max:10',
        ]);

        $locale = $validated['locale'];

        $locales = Arr::wrap($project->locales);
        if (in_array($locale, $locales)) {
            return response()->json(['message' => 'Locale already exists'], 422);
        }

        $locales[] = $locale;
        $project->locales = $locales;
        $project->save();

        return response()->json($project->fresh());
    }

    public function deleteLocale(Project $project, string $locale)
    {
        if ($locale === $project->default_locale) {
            return response()->json(['message' => 'Cannot delete default locale'], 422);
        }

        $locales = collect(Arr::wrap($project->locales))->filter(fn($l) => $l !== $locale)->values()->all();
        $project->locales = $locales;
        $project->save();

        return response()->json($project->fresh());
    }

    public function setDefaultLocale(Request $request, Project $project)
    {
        $validated = $request->validate([
            'locale' => 'required|string|max:10',
        ]);

        $locale = $validated['locale'];

        $locales = Arr::wrap($project->locales);
        if (!in_array($locale, $locales)) {
            $locales[] = $locale;
        }

        $project->locales = $locales;
        $project->default_locale = $locale;
        $project->save();

        return response()->json($project->fresh());
    }

    /* ------------------------ Member management --------------------- */

    public function addMember(Request $request, Project $project)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id'
        ]);

        $project->members()->syncWithoutDetaching([$validated['user_id']]);

        return response()->json($project->load('members.roles'));
    }

    public function removeMember(Project $project, $userId)
    {
        $project->members()->detach($userId);

        return response()->json($project->load('members.roles'));
    }

    /* ------------------ API Token management ------------------ */

    public function createToken(Request $request, Project $project)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'abilities' => 'required|array|min:1',
        ]);

        $token = $project->createToken($validated['name'], $validated['abilities']);

        return response()->json([
            'token' => $token->plainTextToken,
            'token_id' => $token->accessToken->id,
        ]);
    }

    public function updateToken(Request $request, Project $project, $tokenId)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'abilities' => 'required|array|min:1',
        ]);

        $token = $project->tokens()->findOrFail($tokenId);
        $token->name = $validated['name'];
        $token->abilities = $validated['abilities'];
        $token->save();

        return response()->json(['message' => 'Token updated.']);
    }

    public function deleteToken(Project $project, $tokenId)
    {
        $project->tokens()->where('id', $tokenId)->delete();
        return response()->json(['message' => 'Token deleted.']);
    }

    public function togglePublicApi(Project $project)
    {
        $project->public_api = !$project->public_api;
        $project->save();
        return response()->json(['public_api' => $project->public_api]);
    }

    /**
     * Show export/import settings page.
     */
    public function exportImport(Project $project)
    {
        $project->load(['collections:id,project_id,name,slug']);
        return Inertia::render('Projects/Settings/ExportImport', [
            'project' => $project,
        ]);
    }

    /**
     * Export project structure to JSON.
     */
    public function exportProject(Request $request, Project $project)
    {
        $validated = $request->validate([
            'include_collections' => 'sometimes|boolean',
            'include_content' => 'sometimes|boolean',
        ]);

        $includeCollections = $validated['include_collections'] ?? true;
        $includeContent = $validated['include_content'] ?? false;

        $exportData = \App\Services\ProjectExportService::export($project, $includeCollections, $includeContent);

        // Create a safe filename from project name
        $safeName = \Illuminate\Support\Str::slug($project->name) ?: 'project-' . $project->id;
        
        return response()->json($exportData)
            ->header('Content-Type', 'application/json')
            ->header('Content-Disposition', 'attachment; filename="project_' . $safeName . '_' . date('Y-m-d') . '.json"');
    }

    /**
     * Export collection structure to JSON.
     */
    public function exportCollection(Request $request, Project $project, \App\Models\Collection $collection)
    {
        $validated = $request->validate([
            'include_content' => 'sometimes|boolean',
        ]);

        $includeContent = $validated['include_content'] ?? false;
        $exportData = \App\Services\ProjectExportService::exportCollection($collection, $includeContent);

        return response()->json($exportData)
            ->header('Content-Type', 'application/json')
            ->header('Content-Disposition', 'attachment; filename="collection_' . $collection->slug . '_' . date('Y-m-d') . '.json"');
    }
} 