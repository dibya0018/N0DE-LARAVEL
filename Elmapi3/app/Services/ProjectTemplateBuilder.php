<?php

namespace App\Services;

use Illuminate\Support\Str;
use App\Models\Project;

class ProjectTemplateBuilder
{
    /**
     * Build a template array from a project.
     */
    public static function build(Project $project, string $slug = null, string $name = null, string $description = null, bool $withDemoData = false): array
    {
        $slug = $slug ? Str::slug($slug) : Str::slug($project->name);
        $name = $name ?? $project->name;
        $description = $description ?? "Template exported from project #{$project->id}";

        // Preload collections + fields
        $project->load(['collections.fields']);

        // Map id=>slug for relation fields translation
        $collectionSlugById = $project->collections->pluck('slug', 'id');

        $template = [
            'slug'          => $slug,
            'name'          => $name,
            'description'   => $description,
            'has_demo_data' => (bool) $withDemoData,
            'collections'   => [],
        ];

        foreach ($project->collections as $collection) {
            $collArr = [
                'name'         => $collection->name,
                'slug'         => $collection->slug,
                'is_singleton' => (bool) $collection->is_singleton,
                'fields'       => [],
            ];

            foreach ($collection->fields as $field) {
                $opts = $field->options ?? [];
                // For relation fields convert internal collection id into slug reference
                if ($field->type === 'relation' && isset($opts['relation']['collection'])) {
                    $targetId = $opts['relation']['collection'];
                    $opts['relation']['collection'] = $collectionSlugById[$targetId] ?? $targetId;
                }

                $collArr['fields'][] = [
                    'type'        => $field->type,
                    'label'       => $field->label,
                    'name'        => $field->name,
                    'description' => $field->description,
                    'placeholder' => $field->placeholder,
                    'options'     => $opts,
                    'validations' => $field->validations ?? [],
                ];
            }

            $template['collections'][] = $collArr;
        }

        if ($withDemoData) {
            // eager load entries with values + relations
            $project->load([
                'collections.contentEntries.fieldValues.field',
                'collections.contentEntries.fieldValues.mediaRelations',
                'collections.contentEntries.fieldValues.valueRelations',
            ]);

            $tempCounter = 1;
            $uuidToTempId = [];

            // assign temp ids for each entry
            foreach ($project->collections as $c) {
                foreach ($c->contentEntries()->where('status', 'published')->get() as $e) {
                    if (!isset($uuidToTempId[$e->uuid])) {
                        $uuidToTempId[$e->uuid] = 'e' . $tempCounter++;
                    }
                }
            }

            $demoData = [];
            foreach ($project->collections as $collection) {
                $entriesArr = [];
                foreach ($collection->contentEntries()->where('status', 'published')->get() as $entry) {
                    $tempId = $uuidToTempId[$entry->uuid];

                    $entryArr = [
                        'id'     => $tempId,
                        'locale' => $entry->locale,
                        'status' => $entry->status,
                        'fields' => [],
                    ];

                    foreach ($entry->fieldValues as $fv) {
                        $fieldName = $fv->field->name ?? null;
                        if (!$fieldName) continue;

                        switch ($fv->field->type) {
                            case 'number':
                                $val = $fv->number_value; break;
                            case 'boolean':
                                $val = $fv->boolean_value; break;
                            case 'date':
                            case 'datetime':
                                $val = $fv->date_value ?? $fv->datetime_value; break;
                            case 'enumeration':
                            case 'json':
                                $val = $fv->json_value; break;
                            case 'relation':
                                $relatedTempIds = $fv->valueRelations
                                    ->pluck('related.uuid')
                                    ->map(fn($u) => $uuidToTempId[$u] ?? null)
                                    ->filter()
                                    ->values();
                                $val = $relatedTempIds;
                                break;
                            case 'media':
                                $val = null; // skip media
                                break;
                            default:
                                $val = $fv->text_value; break;
                        }

                        $entryArr['fields'][$fieldName] = $val;
                    }

                    $entriesArr[] = $entryArr;
                }

                if (!empty($entriesArr)) {
                    $demoData[] = [
                        'collection' => $collection->slug,
                        'entries'    => $entriesArr,
                    ];
                }
            }

            $template['demo_data'] = $demoData;
        }

        return $template;
    }
} 