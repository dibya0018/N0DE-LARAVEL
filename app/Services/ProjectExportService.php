<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Collection;
use Illuminate\Support\Str;

class ProjectExportService
{
    /**
     * Export project structure with optional collections and content.
     */
    public static function export(Project $project, bool $includeCollections = true, bool $includeContent = false): array
    {
        $exportData = [
            'name' => $project->name,
            'description' => $project->description,
            'default_locale' => $project->default_locale,
            'locales' => $project->locales,
            'public_api' => $project->public_api,
        ];

        if ($includeCollections) {
            $project->load(['collections.fields']);
            $collectionSlugById = $project->collections->pluck('slug', 'id');

            $exportData['collections'] = [];

            foreach ($project->collections as $collection) {
                $collArr = [
                    'name' => $collection->name,
                    'slug' => $collection->slug,
                    'is_singleton' => (bool) $collection->is_singleton,
                    'fields' => [],
                ];

                foreach ($collection->fields as $field) {
                    $opts = $field->options ?? [];
                    // For relation fields convert internal collection id into slug reference
                    if ($field->type === 'relation' && isset($opts['relation']['collection'])) {
                        $targetId = $opts['relation']['collection'];
                        $opts['relation']['collection'] = $collectionSlugById[$targetId] ?? $targetId;
                    }

                    $fieldData = [
                        'type' => $field->type,
                        'label' => $field->label,
                        'name' => $field->name,
                        'description' => $field->description,
                        'placeholder' => $field->placeholder,
                        'options' => $opts,
                        'validations' => $field->validations ?? [],
                    ];

                    // Include children for group fields
                    if ($field->type === 'group') {
                        $children = $field->children()->orderBy('order')->get();
                        if ($children->isNotEmpty()) {
                            $fieldData['children'] = $children->map(function ($child) {
                                return [
                                    'type' => $child->type,
                                    'label' => $child->label,
                                    'name' => $child->name,
                                    'description' => $child->description,
                                    'placeholder' => $child->placeholder,
                                    'options' => $child->options ?? [],
                                    'validations' => $child->validations ?? [],
                                ];
                            })->toArray();
                        }
                    }

                    $collArr['fields'][] = $fieldData;
                }

                $exportData['collections'][] = $collArr;
            }

            if ($includeContent) {
                $exportData['demo_data'] = self::exportContent($project);
            }
        }

        return $exportData;
    }

    /**
     * Export a single collection structure with optional content.
     */
    public static function exportCollection(Collection $collection, bool $includeContent = false): array
    {
        $collection->load(['fields']);
        $project = $collection->project;
        $project->load(['collections']);
        $collectionSlugById = $project->collections->pluck('slug', 'id');

        $exportData = [
            'name' => $collection->name,
            'slug' => $collection->slug,
            'is_singleton' => (bool) $collection->is_singleton,
            'fields' => [],
        ];

        foreach ($collection->fields as $field) {
            $opts = $field->options ?? [];
            // For relation fields convert internal collection id into slug reference
            if ($field->type === 'relation' && isset($opts['relation']['collection'])) {
                $targetId = $opts['relation']['collection'];
                $opts['relation']['collection'] = $collectionSlugById[$targetId] ?? $targetId;
            }

            $fieldData = [
                'type' => $field->type,
                'label' => $field->label,
                'name' => $field->name,
                'description' => $field->description,
                'placeholder' => $field->placeholder,
                'options' => $opts,
                'validations' => $field->validations ?? [],
            ];

            // Include children for group fields
            if ($field->type === 'group') {
                $children = $field->children()->orderBy('order')->get();
                if ($children->isNotEmpty()) {
                    $fieldData['children'] = $children->map(function ($child) {
                        return [
                            'type' => $child->type,
                            'label' => $child->label,
                            'name' => $child->name,
                            'description' => $child->description,
                            'placeholder' => $child->placeholder,
                            'options' => $child->options ?? [],
                            'validations' => $child->validations ?? [],
                        ];
                    })->toArray();
                }
            }

            $exportData['fields'][] = $fieldData;
        }

        // Include content if requested
        if ($includeContent) {
            $exportData['demo_data'] = self::exportCollectionContent($collection);
        }

        return $exportData;
    }

    /**
     * Export content for a single collection.
     */
    protected static function exportCollectionContent(Collection $collection): array
    {
        $collection->load([
            'contentEntries.fieldValues.field',
            'contentEntries.fieldValues.mediaRelations',
            'contentEntries.fieldValues.valueRelations',
            'project.collections',
        ]);

        $project = $collection->project;
        $tempCounter = 1;
        $uuidToTempId = [];

        // Assign temp ids for each entry
        foreach ($collection->contentEntries()->where('status', 'published')->get() as $e) {
            if (!isset($uuidToTempId[$e->uuid])) {
                $uuidToTempId[$e->uuid] = 'e' . $tempCounter++;
            }
        }

        // Also get temp ids for related entries in other collections
        foreach ($project->collections as $c) {
            foreach ($c->contentEntries()->where('status', 'published')->get() as $e) {
                if (!isset($uuidToTempId[$e->uuid])) {
                    $uuidToTempId[$e->uuid] = 'e' . $tempCounter++;
                }
            }
        }

        $entriesArr = [];
        foreach ($collection->contentEntries()->where('status', 'published')->get() as $entry) {
            $tempId = $uuidToTempId[$entry->uuid];

            $entryArr = [
                'id' => $tempId,
                'locale' => $entry->locale,
                'status' => $entry->status,
                'fields' => [],
            ];

            foreach ($entry->fieldValues as $fv) {
                $fieldName = $fv->field->name ?? null;
                if (!$fieldName) continue;

                switch ($fv->field->type) {
                    case 'number':
                        $val = $fv->number_value;
                        break;
                    case 'boolean':
                        $val = $fv->boolean_value;
                        break;
                    case 'date':
                    case 'datetime':
                        $val = $fv->date_value ?? $fv->datetime_value;
                        break;
                    case 'enumeration':
                    case 'json':
                        $val = $fv->json_value;
                        break;
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
                    case 'group':
                        // Handle group fields
                        $groupInstances = $entry->fieldGroups()
                            ->where('field_id', $fv->field->id)
                            ->orderBy('sort_order')
                            ->get();
                        
                        $groupValues = [];
                        foreach ($groupInstances as $groupInstance) {
                            $instanceData = [];
                            $childFields = $fv->field->children()->orderBy('order')->get();
                            foreach ($childFields as $childField) {
                                $childValue = $entry->fieldValues()
                                    ->where('field_id', $childField->id)
                                    ->where('group_instance_id', $groupInstance->id)
                                    ->first();
                                
                                if ($childValue) {
                                    $instanceData[$childField->name] = self::getFieldValue($childValue, $childField);
                                }
                            }
                            $groupValues[] = $instanceData;
                        }
                        $val = $fv->field->options['repeatable'] ?? false ? $groupValues : ($groupValues[0] ?? null);
                        break;
                    default:
                        $val = $fv->text_value;
                        break;
                }

                // Handle repeatable fields
                if ($fv->field->type !== 'group' && ($fv->field->options['repeatable'] ?? false)) {
                    $allValues = $entry->fieldValues()
                        ->where('field_id', $fv->field->id)
                        ->get()
                        ->map(fn($v) => self::getFieldValue($v, $fv->field))
                        ->toArray();
                    $val = $allValues;
                }

                if ($val !== null) {
                    $entryArr['fields'][$fieldName] = $val;
                }
            }

            $entriesArr[] = $entryArr;
        }

        return [
            [
                'collection' => $collection->slug,
                'entries' => $entriesArr,
            ]
        ];
    }

    /**
     * Export content entries similar to ProjectTemplateBuilder.
     */
    protected static function exportContent(Project $project): array
    {
        $project->load([
            'collections.contentEntries.fieldValues.field',
            'collections.contentEntries.fieldValues.mediaRelations',
            'collections.contentEntries.fieldValues.valueRelations',
        ]);

        $tempCounter = 1;
        $uuidToTempId = [];

        // Assign temp ids for each entry
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
                    'id' => $tempId,
                    'locale' => $entry->locale,
                    'status' => $entry->status,
                    'fields' => [],
                ];

                foreach ($entry->fieldValues as $fv) {
                    $fieldName = $fv->field->name ?? null;
                    if (!$fieldName) continue;

                    switch ($fv->field->type) {
                        case 'number':
                            $val = $fv->number_value;
                            break;
                        case 'boolean':
                            $val = $fv->boolean_value;
                            break;
                        case 'date':
                        case 'datetime':
                            $val = $fv->date_value ?? $fv->datetime_value;
                            break;
                        case 'enumeration':
                        case 'json':
                            $val = $fv->json_value;
                            break;
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
                        case 'group':
                            // Handle group fields
                            $groupInstances = $entry->fieldGroups()
                                ->where('field_id', $fv->field->id)
                                ->orderBy('sort_order')
                                ->get();
                            
                            $groupValues = [];
                            foreach ($groupInstances as $groupInstance) {
                                $instanceData = [];
                                $childFields = $fv->field->children()->orderBy('order')->get();
                                foreach ($childFields as $childField) {
                                    $childValue = $entry->fieldValues()
                                        ->where('field_id', $childField->id)
                                        ->where('group_instance_id', $groupInstance->id)
                                        ->first();
                                    
                                    if ($childValue) {
                                        $instanceData[$childField->name] = self::getFieldValue($childValue, $childField);
                                    }
                                }
                                $groupValues[] = $instanceData;
                            }
                            $val = $fv->field->options['repeatable'] ?? false ? $groupValues : ($groupValues[0] ?? null);
                            break;
                        default:
                            $val = $fv->text_value;
                            break;
                    }

                    // Handle repeatable fields
                    if ($fv->field->type !== 'group' && ($fv->field->options['repeatable'] ?? false)) {
                        $allValues = $entry->fieldValues()
                            ->where('field_id', $fv->field->id)
                            ->get()
                            ->map(fn($v) => self::getFieldValue($v, $fv->field))
                            ->toArray();
                        $val = $allValues;
                    }

                    if ($val !== null) {
                        $entryArr['fields'][$fieldName] = $val;
                    }
                }

                $entriesArr[] = $entryArr;
            }

            if (!empty($entriesArr)) {
                $demoData[] = [
                    'collection' => $collection->slug,
                    'entries' => $entriesArr,
                ];
            }
        }

        return $demoData;
    }

    /**
     * Get field value based on field type.
     */
    protected static function getFieldValue($fieldValue, $field)
    {
        switch ($field->type) {
            case 'number':
                return $fieldValue->number_value;
            case 'boolean':
                return $fieldValue->boolean_value;
            case 'date':
            case 'datetime':
                return $fieldValue->date_value ?? $fieldValue->datetime_value;
            case 'enumeration':
            case 'json':
                return $fieldValue->json_value;
            default:
                return $fieldValue->text_value;
        }
    }
}

