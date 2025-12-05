<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Webhook;
use Illuminate\Http\Request;

class WebhookController extends Controller
{
    /**
     * Return list of webhooks for the given project.
     */
    public function index(Project $project)
    {
        $webhooks = $project->webhooks()->with('collections:id,name')->get();
        return response()->json($webhooks);
    }

    /**
     * Store a new webhook on the given project.
     */
    public function store(Request $request, Project $project)
    {
        $validated = $this->validateWebhook($request);

        $webhook = new Webhook(collect($validated)->except('collection_ids')->toArray());
        $webhook->project()->associate($project);
        $webhook->created_by = auth()->id();
        $webhook->save();

        // Attach collections if provided
        if(!empty($validated['collection_ids'] ?? [])) {
            $webhook->collections()->sync($validated['collection_ids']);
        }

        return response()->json($webhook->load('collections'));
    }

    /**
     * Update the specified webhook.
     */
    public function update(Request $request, Project $project, Webhook $webhook)
    {
        // Ensure the webhook belongs to the project
        if($webhook->project_id !== $project->id) {
            abort(404);
        }

        $validated = $this->validateWebhook($request, $webhook->id);

        $webhook->fill(collect($validated)->except('collection_ids')->toArray());
        $webhook->save();

        if(isset($validated['collection_ids'])) {
            $webhook->collections()->sync($validated['collection_ids']);
        }

        return response()->json($webhook->load('collections'));
    }

    /**
     * Delete webhook
     */
    public function destroy(Project $project, Webhook $webhook)
    {
        if($webhook->project_id !== $project->id) {
            abort(404);
        }

        $webhook->collections()->detach();
        $webhook->logs()->delete();
        $webhook->delete();

        return response()->json(['message' => 'Deleted']);
    }

    /**
     * Show logs page for a webhook.
     */
    public function logs(Project $project, Webhook $webhook)
    {
        if($webhook->project_id !== $project->id) abort(404);

        $logs = $webhook->logs()->orderByDesc('created_at')->paginate(25);

        return inertia('Projects/Settings/WebhookLogs', [
            'project' => $project,
            'webhook' => $webhook->only('id','name'),
            'logs' => $logs,
        ]);
    }

    /**
     * Validation helper.
     */
    private function validateWebhook(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'name'           => 'required|string|max:255',
            'description'    => 'nullable|string',
            'url'            => 'required|url',
            'secret'         => 'nullable|string|max:255|min:6',
            'events'         => 'required|array|min:1',
            'sources'        => 'required|array|min:1',
            'payload'        => 'boolean',
            'status'         => 'boolean',
            'collection_ids' => 'array',
        ]);
    }
} 