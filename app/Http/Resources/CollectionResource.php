<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class CollectionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     */
    public function toArray($request): array
    {
        return [
            'uuid' => $this->uuid,
            'name' => $this->name,
            'slug' => $this->slug,
            'is_singleton' => $this->is_singleton,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            // Include fields only if relationship is loaded
            'fields' => $this->whenLoaded('fields', function () {
                // Return all fields in a flat list (parent and child fields)
                $allFields = collect();
                
                // Add parent fields
                foreach ($this->fields as $field) {
                    $allFields->push($this->transformField($field));
                    
                    // Add child fields
                    if ($field->children) {
                        foreach ($field->children as $child) {
                            $allFields->push($this->transformField($child));
                        }
                    }
                }
                
                return $allFields->values();
            }),
        ];
    }

    protected function transformField($field): array
    {
        return [
            'id' => $field->id,
            'uuid' => $field->uuid,
            'type' => $field->type,
            'label' => $field->label,
            'name' => $field->name,
            'description' => $field->description,
            'placeholder' => $field->placeholder,
            'options' => $field->options,
            'validations' => $field->validations,
            'order' => $field->order,
            'parent_field_id' => $field->parent_field_id,
            // Don't include children here - frontend organizes by parent_field_id
        ];
    }
} 