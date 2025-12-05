<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\Project;
use App\Models\ContentEntry;
use App\Models\ContentFieldValue;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class ProjectController extends Controller
{
    public function store(Request $request): RedirectResponse 
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'not_regex:/[#$%^&*()+=\-\[\]\';,\/{}|":<>?~\\\\]/'],
            'default_locale' => 'required|string|max:255',
            'description' => 'nullable|string',
            'template_slug' => 'nullable|string',
            'with_demo_data' => 'sometimes|boolean',
            'import_file' => 'nullable|file|mimes:json',
        ]);

        // Determine default_locale - use template's if available, otherwise use form value
        $defaultLocale = $validated['default_locale'];
        $locales = [$validated['default_locale']];
        $publicApi = false;

        // If using a template, get its settings
        if (!empty($validated['template_slug'])) {
            $templateRecord = \App\Models\ProjectTemplate::where('slug', $validated['template_slug'])->first();
            if ($templateRecord) {
                $template = $templateRecord->data;
            } else {
                $templatesDir = resource_path('data/project_templates');
                if (is_dir($templatesDir)) {
                    $templatePath = $templatesDir . '/' . $validated['template_slug'] . '.json';
                    if (file_exists($templatePath)) {
                        $template = json_decode(file_get_contents($templatePath), true);
                    }
                }
            }
            
            if (isset($template)) {
                if (isset($template['default_locale'])) {
                    $defaultLocale = $template['default_locale'];
                }
                if (isset($template['locales'])) {
                    $locales = $template['locales'];
                }
                if (isset($template['public_api'])) {
                    $publicApi = $template['public_api'];
                }
            }
        }

        $project = Project::create([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'default_locale' => $defaultLocale,
            'locales' => $locales,
            'public_api' => $publicApi,
            'disk' => 'public',
        ]);

        // Automatically add creator as member
        if (!auth()->user()->projects()->where('projects.id', $project->id)->exists() && !auth()->user()->can('access_all_projects')) {
            $project->members()->attach(auth()->id());
        }

        // Import from file if provided
        if ($request->hasFile('import_file')) {
            $this->importFromFile($project, $request->file('import_file'));
        }
        // Apply template collections/fields if provided
        elseif (!empty($validated['template_slug'])) {
            $this->applyTemplate($project, $validated['template_slug'], $validated['with_demo_data'] ?? false);
        }

        return redirect(route('projects.show', ['project' => $project], absolute: false));
    }

    /**
     * Import project from JSON file
     */
    public function import(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'not_regex:/[#$%^&*()+=\-\[\]\';,\/{}|":<>?~\\\\]/'],
            'default_locale' => 'required|string|max:255',
            'description' => 'nullable|string',
            'import_file' => 'required|file|mimes:json',
        ]);

        $file = $request->file('import_file');
        $content = file_get_contents($file->getRealPath());
        $template = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return redirect()->back()->withErrors(['import_file' => 'Invalid JSON file']);
        }

        $project = Project::create([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'default_locale' => $template['default_locale'] ?? $validated['default_locale'],
            'locales' => $template['locales'] ?? [$template['default_locale'] ?? $validated['default_locale']],
            'public_api' => $template['public_api'] ?? false,
            'disk' => 'public',
        ]);

        // Automatically add creator as member
        if (!auth()->user()->projects()->where('projects.id', $project->id)->exists() && !auth()->user()->can('access_all_projects')) {
            $project->members()->attach(auth()->id());
        }

        // Apply imported template
        $this->applyImportedTemplate($project, $template);

        return redirect(route('projects.show', ['project' => $project], absolute: false));
    }

    /**
     * Import project structure from uploaded file
     */
    protected function importFromFile(Project $project, $file)
    {
        $content = file_get_contents($file->getRealPath());
        $template = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception('Invalid JSON file');
        }

        // Update project settings from template if provided
        if (isset($template['default_locale']) || isset($template['locales']) || isset($template['public_api'])) {
            $updateData = [];
            if (isset($template['default_locale'])) {
                $updateData['default_locale'] = $template['default_locale'];
            }
            if (isset($template['locales'])) {
                $updateData['locales'] = $template['locales'];
            }
            if (isset($template['public_api'])) {
                $updateData['public_api'] = $template['public_api'];
            }
            $project->update($updateData);
        }

        $this->applyImportedTemplate($project, $template);
    }

    /**
     * Apply imported template (similar to applyTemplate but uses template array directly)
     */
    protected function applyImportedTemplate(Project $project, array $template)
    {
        if (empty($template['collections'])) return;

        $withDemoData = !empty($template['demo_data']);

        // Will collect relation field values to process after all entries are created
        $pendingRelations = [];

        DB::transaction(function () use ($template, $project, $withDemoData, &$pendingRelations) {
            $collectionsMap = [];

            // 1) Create collections and fields
            foreach ($template['collections'] as $colData) {
                $collection = $project->collections()->create([
                    'name' => $colData['name'],
                    'slug' => $colData['slug'],
                    'order' => $project->collections()->count() + 1,
                    'is_singleton' => $colData['is_singleton'] ?? false,
                ]);

                $collectionsMap[$collection->slug] = $collection;

                if (!empty($colData['fields']) && is_array($colData['fields'])) {
                    foreach ($colData['fields'] as $fieldIdx => $fieldData) {
                        $field = $collection->fields()->create([
                            'type' => $fieldData['type'],
                            'label' => $fieldData['label'],
                            'name' => $fieldData['name'],
                            'description' => $fieldData['description'] ?? null,
                            'placeholder' => $fieldData['placeholder'] ?? null,
                            'options' => $fieldData['options'] ?? [],
                            'validations' => $fieldData['validations'] ?? [],
                            'project_id' => $project->id,
                            'order' => $fieldIdx + 1,
                        ]);

                        // Handle group field children
                        if ($fieldData['type'] === 'group' && !empty($fieldData['children']) && is_array($fieldData['children'])) {
                            foreach ($fieldData['children'] as $childIdx => $childData) {
                                $collection->fields()->create([
                                    'type' => $childData['type'],
                                    'label' => $childData['label'],
                                    'name' => $childData['name'],
                                    'description' => $childData['description'] ?? null,
                                    'placeholder' => $childData['placeholder'] ?? null,
                                    'options' => $childData['options'] ?? [],
                                    'validations' => $childData['validations'] ?? [],
                                    'project_id' => $project->id,
                                    'parent_field_id' => $field->id,
                                    'order' => $childIdx + 1,
                                ]);
                            }
                        }
                    }
                }
            }

            // 2) Update relation fields so option "collection" stores internal collection ID
            foreach ($collectionsMap as $col) {
                $col->fields()->each(function ($field) use ($collectionsMap) {
                    if ($field->type !== 'relation' || !isset($field->options['relation']['collection'])) return;

                    $targetSlug = $field->options['relation']['collection'];
                    if (!isset($collectionsMap[$targetSlug])) return;

                    $opts = $field->options;
                    $opts['relation']['type'] = $opts['relation']['type'] ?? 1;
                    $opts['relation']['collection'] = $collectionsMap[$targetSlug]->id;

                    $field->options = $opts;
                    $field->save();
                });
            }

            // 3) Seed demo data if available
            $tempIdToEntryId = [];

            if ($withDemoData && !empty($template['demo_data']) && is_array($template['demo_data'])) {
                foreach ($template['demo_data'] as $demoGroup) {
                    $colSlug = $demoGroup['collection'] ?? null;
                    if (!$colSlug || !isset($collectionsMap[$colSlug])) continue;

                    $collection = $collectionsMap[$colSlug];
                    $fieldMap = $collection->fields()->get()->keyBy('name');

                    foreach ($demoGroup['entries'] as $entryData) {
                        $status = in_array(($entryData['status'] ?? 'draft'), ['draft', 'published']) ? $entryData['status'] : 'draft';

                        // Extract published_date from fields for published_at
                        $publishedDate = null;
                        if ($status === 'published' && isset($entryData['fields']['published_date'])) {
                            try {
                                $publishedDate = Carbon::parse($entryData['fields']['published_date']);
                            } catch (\Exception $e) {
                                $publishedDate = now();
                            }
                        } elseif ($status === 'published') {
                            $publishedDate = now();
                        }

                        $entry = $collection->contentEntries()->create([
                            'project_id' => $project->id,
                            'locale' => $entryData['locale'] ?? $project->default_locale,
                            'status' => $status,
                            'translation_group_id' => $entryData['translation_group_id'] ?? null,
                            'created_by' => auth()->id(),
                            'updated_by' => auth()->id(),
                            'published_at' => $publishedDate,
                        ]);

                        if (isset($entryData['id'])) {
                            $tempIdToEntryId[$entryData['id']] = $entry->id;
                        }

                        foreach ($entryData['fields'] as $fieldName => $value) {
                            if (!$fieldMap->has($fieldName)) continue;

                            $field = $fieldMap[$fieldName];

                            if ($field->type === 'group') {
                                $this->saveFieldGroupFromTemplate($entry, $field, $value, $project, $collection);
                            } elseif ($field->type === 'relation') {
                                $identifiers = $value;

                                $fv = $entry->fieldValues()->create([
                                    'project_id' => $project->id,
                                    'collection_id' => $collection->id,
                                    'field_id' => $field->id,
                                    'field_type' => $field->type,
                                    'json_value' => $identifiers,
                                ]);

                                $pendingRelations[] = [
                                    'fieldValue' => $fv,
                                    'identifiers' => $identifiers,
                                ];
                            } else {
                                $isRepeatable = isset($field->options['repeatable']) && $field->options['repeatable'];
                                
                                if ($isRepeatable && is_array($value)) {
                                    foreach ($value as $item) {
                                        $column = $this->columnFor($field->type);
                                        $entry->fieldValues()->create([
                                            'project_id' => $project->id,
                                            'collection_id' => $collection->id,
                                            'field_id' => $field->id,
                                            'field_type' => $field->type,
                                            $column => $item,
                                        ]);
                                    }
                                } else {
                                    $column = $this->columnFor($field->type);
                                    $entry->fieldValues()->create([
                                        'project_id' => $project->id,
                                        'collection_id' => $collection->id,
                                        'field_id' => $field->id,
                                        'field_type' => $field->type,
                                        $column => $value,
                                    ]);
                                }
                            }
                        }
                    }
                }
            }

            // 4) Resolve relations
            foreach ($pendingRelations as $rel) {
                $fieldValue = $rel['fieldValue'];
                $identifiers = is_array($rel['identifiers']) ? $rel['identifiers'] : [$rel['identifiers']];

                $resolvedIds = [];
                foreach ($identifiers as $identifier) {
                    if (empty($identifier)) continue;
                    if (isset($tempIdToEntryId[$identifier])) {
                        $resolvedIds[] = $tempIdToEntryId[$identifier];
                    }
                }

                $resolvedIds = array_values(array_unique($resolvedIds));
                $fieldValue->json_value = $resolvedIds;
                $fieldValue->save();

                foreach ($resolvedIds as $idx => $relId) {
                    $fieldValue->valueRelations()->create([
                        'related_id' => $relId,
                        'related_type' => \App\Models\ContentEntry::class,
                        'sort_order' => $idx,
                    ]);
                }
            }
        });
    }

    protected function applyTemplate(Project $project, string $slug, bool $withDemoData = false): void
    {
        $templateRecord = \App\Models\ProjectTemplate::where('slug', $slug)->first();

        // Fallback to JSON files (legacy) if not found in DB
        if (!$templateRecord) {
            $templatesDir = resource_path('data/project_templates');
            
            // Try new directory structure first
            if (is_dir($templatesDir)) {
                $templatePath = $templatesDir . '/' . $slug . '.json';
                if (file_exists($templatePath)) {
                    $template = json_decode(file_get_contents($templatePath), true);
                } else {
                    $template = null;
                }
            } else {
                // Fallback to old single file format for backwards compatibility
            $path = resource_path('data/project_templates.json');
                if (file_exists($path)) {
            $templates = json_decode(file_get_contents($path), true) ?? [];
            $template = collect($templates)->firstWhere('slug', $slug);
                } else {
                    $template = null;
                }
            }
        } else {
            $template = $templateRecord->data;
        }

        if (!$template || empty($template['collections'])) return;

        // Update project settings from template if provided
        if (isset($template['default_locale']) || isset($template['locales']) || isset($template['public_api'])) {
            $updateData = [];
            if (isset($template['default_locale'])) {
                $updateData['default_locale'] = $template['default_locale'];
            }
            if (isset($template['locales'])) {
                $updateData['locales'] = $template['locales'];
            }
            if (isset($template['public_api'])) {
                $updateData['public_api'] = $template['public_api'];
            }
            $project->update($updateData);
        }

        // Will collect relation field values to process after all entries are created
        $pendingRelations = [];

        DB::transaction(function () use ($template, $project, $withDemoData, &$pendingRelations) {
            $collectionsMap = [];

            // 1) Create collections and fields
            foreach ($template['collections'] as $colData) {
                $collection = $project->collections()->create([
                    'name' => $colData['name'],
                    'slug' => $colData['slug'],
                    'order' => $project->collections()->count() + 1,
                    'is_singleton' => $colData['is_singleton'] ?? false,
                ]);

                $collectionsMap[$collection->slug] = $collection;

                if (!empty($colData['fields']) && is_array($colData['fields'])) {
                    foreach ($colData['fields'] as $fieldIdx => $fieldData) {
                        $field = $collection->fields()->create([
                            'type' => $fieldData['type'],
                            'label' => $fieldData['label'],
                            'name' => $fieldData['name'],
                            'description' => $fieldData['description'] ?? null,
                            'placeholder' => $fieldData['placeholder'] ?? null,
                            'options' => $fieldData['options'] ?? [],
                            'validations' => $fieldData['validations'] ?? [],
                            'project_id' => $project->id,
                            'order' => $fieldIdx + 1,
                        ]);

                        // Handle group field children
                        if ($fieldData['type'] === 'group' && !empty($fieldData['children']) && is_array($fieldData['children'])) {
                            foreach ($fieldData['children'] as $childIdx => $childData) {
                                $collection->fields()->create([
                                    'type' => $childData['type'],
                                    'label' => $childData['label'],
                                    'name' => $childData['name'],
                                    'description' => $childData['description'] ?? null,
                                    'placeholder' => $childData['placeholder'] ?? null,
                                    'options' => $childData['options'] ?? [],
                                    'validations' => $childData['validations'] ?? [],
                                    'project_id' => $project->id,
                                    'parent_field_id' => $field->id,
                                    'order' => $childIdx + 1,
                                ]);
                            }
                        }
                    }
                }
            }

            // 2) Update relation fields so option "collection" stores internal collection ID (we imported by slug)
            foreach ($collectionsMap as $col) {
                $col->fields()->each(function ($field) use ($collectionsMap) {
                    if ($field->type !== 'relation' || !isset($field->options['relation']['collection'])) return;

                    $targetSlug = $field->options['relation']['collection'];
                    if (!isset($collectionsMap[$targetSlug])) return; // unknown target

                    $opts = $field->options;
                    $opts['relation']['type'] = $opts['relation']['type'] ?? 1;
                    $opts['relation']['collection'] = $collectionsMap[$targetSlug]->id;

                    $field->options = $opts;
                    $field->save();
                });
            }

            // 2) Seed demo data if requested
            $tempIdToEntryId = [];

            if ($withDemoData && !empty($template['demo_data']) && is_array($template['demo_data'])) {
                foreach ($template['demo_data'] as $demoGroup) {
                    $colSlug = $demoGroup['collection'] ?? null;
                    if (!$colSlug || !isset($collectionsMap[$colSlug])) continue;

                    $collection = $collectionsMap[$colSlug];
                    $fieldMap = $collection->fields()->get()->keyBy('name');

                    foreach ($demoGroup['entries'] as $entryData) {
                        $status = in_array(($entryData['status'] ?? 'draft'), ['draft', 'published']) ? $entryData['status'] : 'draft';

                        // Extract published_date from fields for published_at
                        $publishedDate = null;
                        if ($status === 'published' && isset($entryData['fields']['published_date'])) {
                            try {
                                $publishedDate = Carbon::parse($entryData['fields']['published_date']);
                            } catch (\Exception $e) {
                                $publishedDate = now();
                            }
                        } elseif ($status === 'published') {
                            $publishedDate = now();
                        }

                        $entry = $collection->contentEntries()->create([
                            'project_id' => $project->id,
                            'locale'     => $entryData['locale'] ?? $project->default_locale,
                            'status'     => $status,
                            'translation_group_id' => $entryData['translation_group_id'] ?? null,
                            'created_by' => auth()->id(),
                            'updated_by' => auth()->id(),
                            'published_at' => $publishedDate,
                        ]);

                        // Record mapping from temp id to real id
                        if (isset($entryData['id'])) {
                            $tempIdToEntryId[$entryData['id']] = $entry->id;
                        }

                        // Save field values
                        foreach ($entryData['fields'] as $fieldName => $value) {
                            if (!$fieldMap->has($fieldName)) continue;

                            $field = $fieldMap[$fieldName];

                            // Handle group fields
                            if ($field->type === 'group') {
                                $this->saveFieldGroupFromTemplate($entry, $field, $value, $project, $collection);
                            } elseif ($field->type === 'relation') {
                                $identifiers = $value; // temp ids

                                $fv = $entry->fieldValues()->create([
                                    'project_id'    => $project->id,
                                    'collection_id' => $collection->id,
                                    'field_id'      => $field->id,
                                    'field_type'    => $field->type,
                                    'json_value'    => $identifiers,
                                ]);

                                $pendingRelations[] = [
                                    'fieldValue'  => $fv,
                                    'identifiers' => $identifiers,
                                ];
                            } else {
                                // Handle repeatable fields
                                $isRepeatable = isset($field->options['repeatable']) && $field->options['repeatable'];
                                
                                if ($isRepeatable && is_array($value)) {
                                    // Save each value separately for repeatable fields
                                    foreach ($value as $item) {
                                        $column = $this->columnFor($field->type);
                                        $entry->fieldValues()->create([
                                            'project_id'    => $project->id,
                                            'collection_id' => $collection->id,
                                            'field_id'      => $field->id,
                                            'field_type'    => $field->type,
                                            $column         => $item,
                                        ]);
                                    }
                                } else {
                                    // Single value field
                                    $column = $this->columnFor($field->type);
                                $entry->fieldValues()->create([
                                    'project_id'    => $project->id,
                                    'collection_id' => $collection->id,
                                    'field_id'      => $field->id,
                                    'field_type'    => $field->type,
                                    $column         => $value,
                                ]);
                                }
                            }
                        }
                    }
                }
            }

            /* ------------------------------------------------------------
             | Second pass – resolve relation identifiers to IDs          |
             ------------------------------------------------------------*/
            foreach ($pendingRelations as $rel) {
                $fieldValue   = $rel['fieldValue'];
                $identifiers  = is_array($rel['identifiers']) ? $rel['identifiers'] : [$rel['identifiers']];

                $resolvedIds = [];
                foreach ($identifiers as $identifier) {
                    if (empty($identifier)) continue;

                    if (isset($tempIdToEntryId[$identifier])) {
                        $resolvedIds[] = $tempIdToEntryId[$identifier];
                    }
                }

                // Ensure unique and re-index
                $resolvedIds = array_values(array_unique($resolvedIds));

                // Update json_value with numeric IDs
                $fieldValue->json_value = $resolvedIds;
                $fieldValue->save();

                // Create pivot rows
                foreach ($resolvedIds as $idx => $relId) {
                    $fieldValue->valueRelations()->create([
                        'related_id'   => $relId,
                        'related_type' => \App\Models\ContentEntry::class,
                        'sort_order'   => $idx,
                    ]);
                }
            }
        });
    }

    public function show(Project $project)
    {
        $project->load(['collections', 'members:id,name']);
        $project->loadCount(['assets', 'content', 'collections']);

        // Last API token usage (might be null)
        $lastUsed = $project->tokens()->max('last_used_at');
        $project->last_api_usage = $lastUsed;

        return Inertia::render('Projects/Show', [
            'project' => $project
        ]);
    }

    public function update(Request $request, Project $project)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'not_regex:/[#$%^&*()+=\-\[\]\';,\/{}|":<>?~\\\\]/'],
            'default_locale' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $project->update($validated);

        // Update disk if provided separately (not part of validation)
        if ($request->filled('disk') && in_array($request->input('disk'), ['public','s3'])) {
            $project->disk = $request->input('disk');
            $project->save();
        }

        return redirect()->route('projects.settings.project', $project);
    }

    public function destroy(Project $project)
    {
        //delete asset metadata
        $project->assets()->each(function ($asset) {
            $asset->metadata()->delete();
        });
        //delete all assets
        $project->assets()->forceDelete();

        //delete collection fields
        $project->collections()->each(function ($collection) {
            $collection->fields()->forceDelete();
        });
        //delete collections
        $project->collections()->forceDelete();

        //delete content field values and relations
        $project->content()->each(function ($content) {
            $content->fieldValues()->each(function ($fieldValue) {
                $fieldValue->valueRelations()->forceDelete();
                $fieldValue->mediaRelations()->forceDelete();
            });
            $content->fieldValues()->forceDelete();
        });
        //delete content
        $project->content()->forceDelete();

        //delete asset folder
        \Illuminate\Support\Facades\Storage::disk($project->disk ?: config('filesystems.default', 'public'))->deleteDirectory('projects/' . $project->uuid);

        //delete project
        $project->forceDelete();

        return redirect()->route('dashboard')
            ->with('success', 'Project deleted successfully.');
    }

    /**
     * Clone a project (structure only, no content entries)
     */
    public function cloneProject(Request $request, Project $project)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'not_regex:/[#$%^&*()+=\-\[\]\\\';,\/{}|":<>?~]/'],
            'description' => 'nullable|string',
        ]);

        // Create new project copying settings from original
        $newProject = Project::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? $project->description,
            'default_locale' => $project->default_locale,
            'locales' => $project->locales,
            'disk' => $project->disk,
            'public_api' => false, // start disabled
        ]);

        // Attach current user as member if needed
        if (!auth()->user()->projects()->where('projects.id', $newProject->id)->exists() && !auth()->user()->can('access_all_projects')) {
            $newProject->members()->attach(auth()->id());
        }

        // Clone collections and fields
        foreach ($project->collections()->with('fields')->get() as $sourceCollection) {
            $cloneCollection = $newProject->collections()->create([
                'name' => $sourceCollection->name,
                'slug' => $sourceCollection->slug,
                'order' => $sourceCollection->order,
                'is_singleton' => $sourceCollection->is_singleton,
            ]);

            foreach ($sourceCollection->fields as $field) {
                $cloneCollection->fields()->create([
                    'type' => $field->type,
                    'label' => $field->label,
                    'name' => $field->name,
                    'description' => $field->description,
                    'placeholder' => $field->placeholder,
                    'options' => $field->options,
                    'validations' => $field->validations,
                    'project_id' => $newProject->id,
                    'order' => $field->order,
                ]);
            }
        }

        return response()->json([
            'redirect' => route('projects.show', $newProject),
        ], 201);
    }

    /**
     * Map a field type to the corresponding column in content_field_values table.
     */
    protected function saveFieldGroupFromTemplate($contentEntry, $field, $value, $project, $collection)
    {
        // Load child fields if not already loaded
        if (!$field->relationLoaded('children')) {
            $field->load('children');
        }

        // Get child fields for this group
        $childFields = $field->children()->orderBy('order')->get();

        if ($childFields->isEmpty()) {
            return;
        }

        // Check if group is repeatable
        $isRepeatable = isset($field->options['repeatable']) && $field->options['repeatable'];

        // Normalize value to array format
        if ($isRepeatable) {
            // Value should be an array of group instances
            $groupInstances = is_array($value) ? $value : [];
        } else {
            // Value should be a single object, wrap it in array
            $groupInstances = is_array($value) && isset($value[0]) ? $value : ($value ? [$value] : []);
        }

        // Create group instances and save child field values
        foreach ($groupInstances as $sortOrder => $instanceData) {
            if (!is_array($instanceData)) {
                continue;
            }

            // Create the group instance
            $groupInstance = \App\Models\ContentFieldGroup::create([
                'project_id' => $project->id,
                'collection_id' => $collection->id,
                'content_entry_id' => $contentEntry->id,
                'field_id' => $field->id,
                'sort_order' => $sortOrder,
            ]);

            // Save child field values for this group instance
            foreach ($childFields as $childField) {
                $childValue = $instanceData[$childField->name] ?? null;

                if ($childValue !== null) {
                    $column = $this->columnFor($childField->type);
                    $contentEntry->fieldValues()->create([
                        'project_id' => $project->id,
                        'collection_id' => $collection->id,
                        'field_id' => $childField->id,
                        'field_type' => $childField->type,
                        'group_instance_id' => $groupInstance->id,
                        $column => $childValue,
                    ]);
                }
            }
        }
    }

    protected function columnFor(string $type): string
    {
        return match ($type) {
            'number' => 'number_value',
            'boolean' => 'boolean_value',
            'date' => 'date_value',
            'json', 'enumeration', 'relation', 'media' => 'json_value',
            default => 'text_value',
        };
    }
}
