<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\AssetResource;

class ContentEntryResource extends JsonResource
{
    public function toArray($request)
    {
        $data = [
            'uuid'         => $this->uuid,
            'locale'       => $this->locale,
            'published_at' => $this->published_at?->toIso8601String(),
            'fields'       => $this->formatFields(),
        ];

        if ($request->has('timestamps')) {
            $data['created_at'] = $this->created_at?->toIso8601String();
            $data['updated_at'] = $this->updated_at?->toIso8601String();
        }

        return $data;
    }

    private function formatFields(): array
    {
        $fields = [];
        
        // First, handle field groups
        $groupFields = [];
        foreach ($this->fieldGroups->sortBy('sort_order') as $group) {
            $field = $group->field;
            if (!$field) {
                continue;
            }
            
            $fieldName = $field->name;
            
            // Skip if field should be hidden in API
            if (isset($field->options['hiddenInAPI']) && $field->options['hiddenInAPI']) {
                continue;
            }
            
            if (!isset($groupFields[$fieldName])) {
                $groupFields[$fieldName] = [];
            }
            
            // Build the group instance data
            $instanceData = [];
            foreach ($group->fieldValues as $fieldValue) {
                $childField = $fieldValue->field;
                if (!$childField) {
                    continue;
                }
                
                // Skip if child field should be hidden in API
                if (isset($childField->options['hiddenInAPI']) && $childField->options['hiddenInAPI']) {
                    continue;
                }
                
                // Skip if the field type is password
                if ($childField->type === 'password') {
                    continue;
                }
                
                $instanceData[$childField->name] = $this->extractValue($fieldValue);
            }
            
            $groupFields[$fieldName][] = $instanceData;
        }
        
        // Add group fields to output
        foreach ($groupFields as $fieldName => $instances) {
            // Get the field from the first group instance
            $firstGroup = $this->fieldGroups->firstWhere('field.name', $fieldName);
            $field = $firstGroup ? $firstGroup->field : null;
            
            if ($field && isset($field->options['repeatable']) && $field->options['repeatable']) {
                $fields[$fieldName] = $instances;
            } else {
                // Single instance - return first one or empty object
                $fields[$fieldName] = $instances[0] ?? [];
            }
        }
        
        // Then, handle regular field values (excluding those in groups)
        foreach ($this->fieldValues as $value) {
            // Skip field values that belong to a group instance
            if ($value->group_instance_id !== null) {
                continue;
            }
            
            $fieldName = $value->field->name ?? 'field_'.$value->field_id;
            
            // Skip if field should be hidden in API
            if ($value->field && isset($value->field->options['hiddenInAPI']) && $value->field->options['hiddenInAPI']) {
                continue;
            }

            // Skip if the field type is password
            if ($value->field && $value->field->type === 'password') {
                continue;
            }

            $isRepeatable = false;
            if ($value->field && isset($value->field->options['repeatable'])) {
                $isRepeatable = (bool) $value->field->options['repeatable'];
            }

            $val = $this->extractValue($value);

            if ($isRepeatable) {
                if (!isset($fields[$fieldName])) {
                    $fields[$fieldName] = [];
                }
                $fields[$fieldName][] = $val;
            } else {
                $fields[$fieldName] = $val;
            }
        }
        
        return $fields;
    }

    private function extractValue($value)
    {
        $field = $value->field;

        if ($field && $field->type === 'media') {
            $assets = $value->mediaRelations
                ->sortBy('sort_order')
                ->pluck('asset')
                ->filter()
                ->values();

            return AssetResource::collection($assets);
        }

        if ($field && $field->type === 'date') {
            $isRange = isset($field->options['mode']) && $field->options['mode'] === 'range';
            $includeTime = isset($field->options['includeTime']) && $field->options['includeTime'];

            if ($isRange) {
                $start = $includeTime ? $value->datetime_value : $value->date_value;
                $end   = $includeTime ? $value->datetime_value_end : $value->date_value_end;

                return [
                    'start' => $start ? $start : null,
                    'end'   => $end ? $end : null,
                ];
            } else {
                $single = $includeTime ? $value->datetime_value : $value->date_value;
                return $single ? $single : null;
            }
        }

        if ($field && $field->type === 'relation') {
            $relatedEntries = $value->valueRelations
                ->sortBy('sort_order')
                ->pluck('related')
                ->filter()
                ->values();

            if ($relatedEntries->isEmpty()) {
                return null;
            }

            $isMultiple = isset($field->options['relation']['type']) && $field->options['relation']['type'] == 2;

            if ($isMultiple) {
                return ContentEntryResource::collection($relatedEntries);
            }

            return new ContentEntryResource($relatedEntries->first());
        }

        if ($field && $field->type === 'richtext') {
            $outputFormat = $field->options['editor']['outputFormat'] ?? 'html';
            
            if ($outputFormat === 'html') {
                return $value->text_value;
            } else {
                return $value->json_value;
            }
        }

        return $value->text_value
            ?? $value->number_value
            ?? $value->boolean_value
            ?? $value->date_value
            ?? $value->datetime_value
            ?? $value->json_value
            ?? null;
    }
} 