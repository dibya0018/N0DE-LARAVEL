<?php

namespace App\Http\Controllers;

use App\Models\CollectionTemplate;
use App\Models\CollectionTemplateField;
use App\Models\Collection;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CollectionTemplateController extends Controller
{
    // Return JSON list of templates with fields
    public function index()
    {
        return response()->json(CollectionTemplate::with('fields')->orderBy('name')->get());
    }

    // Clone a collection into a template
    public function storeFromCollection(Request $request, Project $project, Collection $collection)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:60',
        ]);

        $templateName = $validated['name'] ?? $collection->name;

        // unique slug within templates table
        $slug = Str::slug($templateName);
        if (CollectionTemplate::where('slug', $slug)->exists()) {
            $slug .= '-' . uniqid();
        }

        $template = CollectionTemplate::create([
            'name' => $templateName,
            'slug' => $slug,
            'description' => $collection->description,
            'is_singleton' => $collection->is_singleton,
        ]);

        foreach ($collection->fields as $field) {
            CollectionTemplateField::create([
                'collection_template_id' => $template->id,
                'type' => $field->type,
                'label' => $field->label,
                'name' => $field->name,
                'description' => $field->description,
                'placeholder' => $field->placeholder,
                'options' => $field->options,
                'validations' => $field->validations,
                'order' => $field->order,
            ]);
        }

        return back()->with('success', 'Template created successfully.');
    }
} 