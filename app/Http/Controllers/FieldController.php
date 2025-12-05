<?php

namespace App\Http\Controllers;

use App\Models\Field;
use App\Models\Collection;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class FieldController extends Controller
{
    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, Project $project, Collection $collection)
    {
        $isGroup = $request->input('type') === 'group';
        $parentFieldId = $request->input('parent_field_id');

        if ($isGroup) {
            $parentFieldId = null;
            $request->merge(['parent_field_id' => null]);
        }

        $rules = [
            'type' => 'required|string|max:60',
            'label' => 'required|string|max:60',
            'name' => [
                'required',
                'string',
                'max:60',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('collection_fields', 'name')
                    ->where(function ($query) use ($collection, $request) {
                        $query->where('collection_id', $collection->id)
                              ->where('parent_field_id', $request->input('parent_field_id'));
                    }),
            ],
            'description' => 'nullable|string',
            'placeholder' => 'nullable|string',
            'options' => 'nullable|array',
            'validations' => 'nullable|array',
            'parent_field_id' => [
                'nullable',
                Rule::exists('collection_fields', 'id')
                    ->where(fn ($query) => $query->where('collection_id', $collection->id)
                        ->where('type', 'group')
                        ->whereNull('parent_field_id')),
            ],
        ];

        if ($isGroup) {
            $rules['options.repeatable'] = 'required|boolean';
            // Children are added separately, not required when creating the group
        }

        $validated = $request->validate($rules);

        // If name is not provided, generate it from the label
        if (empty($validated['name'])) {
            $validated['name'] = Str::slug($validated['label']);
        }

        $field = DB::transaction(function () use ($validated, $project, $collection, $isGroup, $parentFieldId) {
            $parentFieldId = $validated['parent_field_id'] ?? null;

            $order = $parentFieldId
                ? Field::where('parent_field_id', $parentFieldId)->max('order') + 1
                : $collection->fields()->max('order') + 1;

            $field = Field::create([
                ...$validated,
                'project_id' => $project->id,
                'collection_id' => $collection->id,
                'order' => $order,
            ]);

            return $field;
        });

        return redirect()->route('projects.collections.edit', [
            'project' => $project->id,
            'collection' => $collection->id,
        ])->with('success', 'Field created successfully');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Project $project, Collection $collection, Field $field)
    {
        $isGroup = $field->type === 'group';
        $rules = [
            'type' => 'required|string|max:60',
            'label' => 'required|string|max:60',
            'name' => [
                'required',
                'string',
                'max:60',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('collection_fields', 'name')
                    ->ignore($field->id)
                    ->where(function ($query) use ($collection, $field, $request) {
                        $parentId = $request->input('parent_field_id', $field->parent_field_id);
                        $query->where('collection_id', $collection->id)
                              ->where('parent_field_id', $parentId);
                    }),
            ],
            'description' => 'nullable|string',
            'placeholder' => 'nullable|string',
            'options' => 'nullable|array',
            'validations' => 'nullable|array',
            'parent_field_id' => [
                'nullable',
                Rule::exists('collection_fields', 'id')
                    ->where(fn ($query) => $query->where('collection_id', $collection->id)
                        ->where('type', 'group')
                        ->whereNull('parent_field_id')),
            ],
        ];

        if ($isGroup) {
            $request->merge(['parent_field_id' => null]);
            $rules['options.repeatable'] = 'required|boolean';
            // Children are managed separately, not updated here
        }

        $validated = $request->validate($rules);

        // If name is not provided, generate it from the label
        if (empty($validated['name'])) {
            $validated['name'] = Str::slug($validated['label']);
        }

        DB::transaction(function () use ($field, $validated, $isGroup) {
            $parentFieldId = $validated['parent_field_id'] ?? $field->parent_field_id;

            if ($field->type === 'group') {
                $parentFieldId = null;
            }

            $field->update([
                ...$validated,
                'parent_field_id' => $parentFieldId,
            ]);

            // Children are managed separately, not updated here
        });

        return redirect()->route('projects.collections.edit', [
            'project' => $project->id,
            'collection' => $collection->id,
        ])->with('success', 'Field updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Project $project, Collection $collection, Field $field)
    {
        $field->delete();

        return redirect()->route('projects.collections.edit', [
            'project' => $project->id,
            'collection' => $collection->id,
        ])->with('success', 'Field deleted successfully');
    }

    public function reorder(Request $request, Project $project, Collection $collection)
    {
        $validated = $request->validate([
            'fields' => 'required|array',
            'fields.*.id' => 'required|exists:collection_fields,id',
            'fields.*.order' => 'required|integer|min:0',
        ]);

        foreach ($validated['fields'] as $field) {
            Field::where('id', $field['id'])->update(['order' => $field['order']]);
        }

        return response()->json(['message' => 'Fields reordered successfully']);
    }
}
