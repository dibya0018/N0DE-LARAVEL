<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array<string, mixed>
     */
    public function toArray($request)
    {
        return [
            'uuid'           => $this->uuid,
            'name'           => $this->name,
            'description'    => $this->description,
            'default_locale' => $this->default_locale,
            'locales'        => $this->locales ?? [],
            'collections'    => $this->whenLoaded('collections', function(){
                return CollectionResource::collection($this->collections);
            }),
            'fields'         => $this->whenLoaded('fields', function(){
                return FieldResource::collection($this->fields);
            }),
        ];
    }
} 