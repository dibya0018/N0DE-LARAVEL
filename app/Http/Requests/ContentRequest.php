<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Collection;
use App\Rules\Color;
use App\Models\ContentFieldValue;

class ContentRequest extends FormRequest
{
    /**
     * Cached resolved collection model instance
     *
     * @var \App\Models\Collection|null
     */
    protected $resolvedCollection;

    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $rules = [];
        $collection = $this->getCollectionModel();

        if (!$collection) {
            // No collection found – return empty rules so validation will fail elsewhere
            return [
                'collection' => 'required',
            ];
        }

        // Load fields with their children for group field validation
        $fields = $collection->fields()->with('children')->get();

        foreach ($fields as $field) {
            $validations = json_decode(json_encode($field->validations));
            $options = json_decode(json_encode($field->options));

            // Handle group fields with nested children
            if ($field->type === 'group' && $field->children->isNotEmpty()) {
                $this->addGroupFieldRules($field, $rules);
            } else {
                // Handle regular fields
                $this->addRequiredRules($field, $validations, $options, $rules);
                $this->addTypeRules($field, $options, $rules);
                $this->addCharCountRules($field, $validations, $options, $rules);
            }
        }

        // After dynamic field rules, add locale rule
        $this->addLocaleRule($rules);

        return $rules;
    }

    public function messages()
    {
        $messages = [];
        $collection = $this->getCollectionModel();

        if (!$collection) {
            return [
                'collection.required' => 'Collection not found.',
            ];
        }

        // Load fields with their children for group field validation
        $fields = $collection->fields()->with('children')->get();

        foreach ($fields as $field) {
            $validations = json_decode(json_encode($field->validations));
            $options = json_decode(json_encode($field->options));

            // Handle group fields with nested children
            if ($field->type === 'group' && $field->children->isNotEmpty()) {
                $this->addGroupFieldMessages($field, $messages);
            } else {
                // Handle regular fields
                $this->addRequiredMessages($field, $validations, $options, $messages);
                $this->addTypeMessages($field, $options, $messages);
                $this->addCharCountMessages($field, $validations, $options, $messages);
            }
        }

        // Locale messages
        $project = $this->attributes->get('project');
        if ($project && $project->locales) {
            $messages['locale.in'] = 'The selected locale is invalid for this project.';
        }
        $messages['locale.required'] = 'The locale field is required.';

        return $messages;
    }

    protected function addRequiredRules($field, $validations, $options, &$rules)
    {
        if (!$validations->required->status) {
            return;
        }

        // For PATCH requests we only validate fields present in the payload
        if ($this->isMethod('patch')) {
            // data.<name> key (or data.<name>.*.value for repeatable) must exist in request for validation to apply
            if (! $this->has('data.' . $field->name)) {
                return;
            }
        }

        if (isset($options->repeatable) && $options->repeatable) {
            $baseKey = 'data.' . $field->name;
            // Require the array itself and at least one element
            $rules[$baseKey][] = 'required';
            $rules[$baseKey][] = 'array';
            // Require each item to have a non-empty value
            $rules[$baseKey . '.*.value'][] = 'required';
        } else {
            $rules['data.' . $field->name][] = 'required';
        }
    }

    protected function addTypeRules($field, $options, &$rules)
    {
        $typeValidations = [
            'email' => 'email',
            'number' => 'numeric',
            'color' => new Color()
        ];

        if (!isset($typeValidations[$field->type])) {
            return;
        }

        if (isset($options->repeatable) && $options->repeatable) {
            $rules['data.' . $field->name . '.*.value'][] = 'nullable';
            $rules['data.' . $field->name . '.*.value'][] = $typeValidations[$field->type];
        } else {
            $rules['data.' . $field->name][] = $typeValidations[$field->type];
            if ($field->type == 'email' || $field->type == 'number' || $field->type == 'color') {
                $rules['data.' . $field->name][] = 'nullable';
            }
        }
    }

    protected function addCharCountRules($field, $validations, $options, &$rules)
    {
        if (!$validations->charcount->status) {
            return;
        }

        $type = $validations->charcount->type;
        $min = $validations->charcount->min ?? null;
        $max = $validations->charcount->max ?? null;

        $validationRules = [
            'Between' => 'between:' . $min . ',' . $max,
            'Min' => 'min:' . $min,
            'Max' => 'max:' . $max
        ];

        if (!isset($validationRules[$type])) {
            return;
        }

        if (isset($options->repeatable) && $options->repeatable) {
            $rules['data.' . $field->name . '.*.value'][] = $validationRules[$type];
        } else {
            $rules['data.' . $field->name][] = $validationRules[$type];
        }
    }

    protected function addRequiredMessages($field, $validations, $options, &$messages)
    {
        if (!$validations->required->status) {
            return;
        }

        $message = $validations->required->message ?? 'The ' . $field->label . ' field is required.';

        if (isset($options->repeatable) && $options->repeatable) {
            $baseKey = 'data.' . $field->name;
            // Message if the whole array missing
            $messages[$baseKey . '.required'] = $message;
            // Message for each element missing value
            $messages[$baseKey . '.*.value.required'] = $message;
        } else {
            $messages['data.' . $field->name . '.required'] = $message;
        }
    }

    protected function addTypeMessages($field, $options, &$messages)
    {
        $typeMessages = [
            'email' => $field->validations->email->message ?? 'The ' . $field->label . ' must be a valid email address.',
            'number' => $field->validations->number->message ?? 'The ' . $field->label . ' must be numeric.',
            'color' => $field->validations->color->message ?? 'The ' . $field->label . ' must be a valid color.'
        ];

        if (!isset($typeMessages[$field->type])) {
            return;
        }

        if (isset($options->repeatable) && $options->repeatable) {
            $messages['data.' . $field->name . '.*.value.' . $field->type] = $typeMessages[$field->type];
        } else {
            $messages['data.' . $field->name . '.' . $field->type] = $typeMessages[$field->type];
        }
    }

    protected function addCharCountMessages($field, $validations, $options, &$messages)
    {
        if (!$validations->charcount->status) {
            return;
        }

        $type = $validations->charcount->type;
        $min = $validations->charcount->min ?? null;
        $max = $validations->charcount->max ?? null;

        // Use custom messages if available, otherwise use default messages
        $validationMessages = [
            'Between' => $validations->charcount->message ?? 'The ' . $field->label . ' must be between ' . $min . ' and ' . $max,
            'Min' => $validations->charcount->message ?? 'The ' . $field->label . ' must be at least ' . $min,
            'Max' => $validations->charcount->message ?? 'The ' . $field->label . ' may not be greater than ' . $max
        ];

        if (!isset($validationMessages[$type])) {
            return;
        }

        $message = $validationMessages[$type];
        if ($field->type != 'number') {
            $message .= '';
        }

        if (isset($options->repeatable) && $options->repeatable) {
            $messages['data.' . $field->name . '.*.value.' . strtolower($type)] = $message;
        } else {
            $messages['data.' . $field->name . '.' . strtolower($type)] = $message;
        }
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $collection = $this->getCollectionModel();

            if(!$collection){
                $validator->errors()->add('collection', 'Collection not found.');
                return;
            }

            // Retrieve the submitted data in a convenient variable
            $inputData = $this->input('data', []);

            foreach ($collection->fields as $field) {
                $validations = json_decode(json_encode($field->validations));

                // Skip if unique validation is not enabled for this field
                if (!$validations->unique->status) {
                    continue;
                }

                // Skip if the request doesn't contain this field
                if (!array_key_exists($field->name, $inputData)) {
                    continue;
                }

                $options = json_decode(json_encode($field->options));

                // Build an array of values that should be checked for uniqueness
                $valuesToCheck = [];

                if (isset($options->repeatable) && $options->repeatable) {
                    // Expect an array of items where each item can be either a scalar or an array containing a "value" key
                    foreach ($inputData[$field->name] as $item) {
                        if (is_array($item)) {
                            $valuesToCheck[] = $item['value'] ?? null;
                        } else {
                            $valuesToCheck[] = $item;
                        }
                    }
                } else {
                    $valuesToCheck[] = $inputData[$field->name];
                }

                // Remove null / empty strings from the values
                $valuesToCheck = array_filter($valuesToCheck, function ($v) {
                    return !(is_null($v) || $v === '');
                });

                if (empty($valuesToCheck)) {
                    continue;
                }

                // Determine the correct column to search based on field type
                $columnMap = [
                    'number' => 'number_value',
                    'boolean' => 'boolean_value',
                    'enumeration' => 'json_value', // JSON column – we will use whereJsonContains
                ];

                foreach ($valuesToCheck as $val) {
                    $query = ContentFieldValue::where('collection_id', $collection->id)
                        ->where('field_id', $field->id);

                    // If we are in edit mode, exclude the current content entry from uniqueness check
                    if ($this->route('contentEntry')) {
                        $currentEntry = $this->route('contentEntry');
                        $query->where('content_entry_id', '!=', $currentEntry->id);
                    }

                    if ($field->type === 'enumeration') {
                        // Enumeration fields are stored in json_value as an array
                        $query->whereJsonContains('json_value', $val);
                    } elseif (isset($columnMap[$field->type])) {
                        $query->where($columnMap[$field->type], $val);
                    } else {
                        // Default to text_value for all other field types
                        $query->where('text_value', $val);
                    }

                    // If any value already exists, add an error and break out of the loop for this field
                    if ($query->exists()) {
                        $errorKey = 'data.' . $field->name;
                        if (isset($options->repeatable) && $options->repeatable) {
                            $errorKey .= '.*.value';
                        }

                        $validator->errors()->add(
                            $errorKey,
                            $validations->unique->message ?? 'The ' . $field->label . ' has already been taken.'
                        );

                        // No need to check other values or further fields if an error has been found for this one
                        break;
                    }
                }
            }
        });
    }

    /************
     * Helpers  *
     ************/

    /**
     * Resolve the collection model regardless of whether the route parameter
     * is a Collection model or just a slug string.
     */
    protected function getCollectionModel()
    {
        if (isset($this->resolvedCollection)) {
            return $this->resolvedCollection;
        }

        $collectionParam = $this->route('collection');

        if ($collectionParam instanceof \App\Models\Collection) {
            return $this->resolvedCollection = $collectionParam;
        }

        if (!$collectionParam) {
            return null;
        }

        $project = $this->route('project') ?? $this->attributes->get('project');

        if ($project) {
            $collection = \App\Models\Collection::where('project_id', $project->id)
                ->where('slug', $collectionParam)
                ->first();
        } else {
            $collection = \App\Models\Collection::where('slug', $collectionParam)->first();
        }

        return $this->resolvedCollection = $collection;
    }

    /**
     * Add validation rules for locale param
     */
    protected function addLocaleRule(&$rules)
    {
        $project = $this->attributes->get('project');

        if ($project) {
            // Locales can be stored as array or comma-separated string. Normalize to array.
            $allowedLocales = $project->locales;
            if (is_string($allowedLocales)) {
                $allowedLocales = array_filter(array_map('trim', explode(',', $allowedLocales)));
            }

            if (empty($allowedLocales)) {
                $allowedLocales = [$project->default_locale];
            }

            if (!empty($allowedLocales)) {
                $rules['locale'] = ['required', 'string', 'in:' . implode(',', $allowedLocales)];
                return;
            }
        }

        // Fallback generic rule
        $rules['locale'] = ['required', 'string', 'max:10'];
    }

    /**
     * Add validation rules for group fields and their nested children
     */
    protected function addGroupFieldRules($groupField, &$rules)
    {
        $isRepeatable = isset($groupField->options['repeatable']) && $groupField->options['repeatable'];
        $baseKey = 'data.' . $groupField->name;

        // For PATCH requests, only validate if the field is present
        if ($this->isMethod('patch') && !$this->has('data.' . $groupField->name)) {
            return;
        }

        // Validate that group field is an array
        if ($isRepeatable) {
            $rules[$baseKey][] = 'nullable';
            $rules[$baseKey][] = 'array';
        } else {
            $rules[$baseKey][] = 'nullable';
            $rules[$baseKey][] = 'array';
        }

        // Process each child field
        foreach ($groupField->children as $childField) {
            $childValidations = json_decode(json_encode($childField->validations));
            $childOptions = json_decode(json_encode($childField->options));

            if ($isRepeatable) {
                // For repeatable groups: data.groupName.*.childFieldName
                $childKey = $baseKey . '.*.' . $childField->name;
            } else {
                // For non-repeatable groups: data.groupName.0.childFieldName
                $childKey = $baseKey . '.0.' . $childField->name;
            }

            // Add required rules
            if ($childValidations->required->status ?? false) {
                $rules[$childKey][] = 'required';
            } else {
                $rules[$childKey][] = 'nullable';
            }

            // Add type rules
            $typeValidations = [
                'email' => 'email',
                'number' => 'numeric',
                'color' => new Color()
            ];

            if (isset($typeValidations[$childField->type])) {
                $rules[$childKey][] = $typeValidations[$childField->type];
            }

            // Add character count rules
            if ($childValidations->charcount->status ?? false) {
                $type = $childValidations->charcount->type ?? null;
                $min = $childValidations->charcount->min ?? null;
                $max = $childValidations->charcount->max ?? null;

                $validationRules = [
                    'Between' => 'between:' . $min . ',' . $max,
                    'Min' => 'min:' . $min,
                    'Max' => 'max:' . $max
                ];

                if (isset($validationRules[$type])) {
                    $rules[$childKey][] = $validationRules[$type];
                }
            }
        }
    }

    /**
     * Add validation messages for group fields and their nested children
     */
    protected function addGroupFieldMessages($groupField, &$messages)
    {
        $isRepeatable = isset($groupField->options['repeatable']) && $groupField->options['repeatable'];
        $baseKey = 'data.' . $groupField->name;

        // Process each child field
        foreach ($groupField->children as $childField) {
            $childValidations = json_decode(json_encode($childField->validations));
            $childOptions = json_decode(json_encode($childField->options));

            if ($isRepeatable) {
                // For repeatable groups: data.groupName.*.childFieldName
                $childKey = $baseKey . '.*.' . $childField->name;
            } else {
                // For non-repeatable groups: data.groupName.0.childFieldName
                $childKey = $baseKey . '.0.' . $childField->name;
            }

            // Add required messages
            if ($childValidations->required->status ?? false) {
                $message = $childValidations->required->message ?? 'The ' . $childField->label . ' field is required.';
                $messages[$childKey . '.required'] = $message;
            }

            // Add type messages
            $typeMessages = [
                'email' => $childValidations->email->message ?? 'The ' . $childField->label . ' must be a valid email address.',
                'number' => $childValidations->number->message ?? 'The ' . $childField->label . ' must be numeric.',
                'color' => $childValidations->color->message ?? 'The ' . $childField->label . ' must be a valid color.'
            ];

            if (isset($typeMessages[$childField->type])) {
                $messages[$childKey . '.' . $childField->type] = $typeMessages[$childField->type];
            }

            // Add character count messages
            if ($childValidations->charcount->status ?? false) {
                $type = $childValidations->charcount->type ?? null;
                $min = $childValidations->charcount->min ?? null;
                $max = $childValidations->charcount->max ?? null;

                $validationMessages = [
                    'Between' => $childValidations->charcount->message ?? 'The ' . $childField->label . ' must be between ' . $min . ' and ' . $max,
                    'Min' => $childValidations->charcount->message ?? 'The ' . $childField->label . ' must be at least ' . $min,
                    'Max' => $childValidations->charcount->message ?? 'The ' . $childField->label . ' may not be greater than ' . $max
                ];

                if (isset($validationMessages[$type])) {
                    $messages[$childKey . '.' . strtolower($type)] = $validationMessages[$type];
                }
            }
        }
    }

    /**
     * If the client omits the locale parameter, automatically set it to the project's default locale
     * so downstream validation and controllers always have a value.
     */
    protected function prepareForValidation(): void
    {
        // If locale is already present, do nothing.
        if ($this->has('locale')) {
            return;
        }

        $project = $this->route('project') ?? $this->attributes->get('project');

        if ($project && $project->default_locale) {
            $this->merge(['locale' => $project->default_locale]);
        }
    }
} 