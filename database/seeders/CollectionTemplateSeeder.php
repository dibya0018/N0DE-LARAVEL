<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CollectionTemplate;
use App\Models\CollectionTemplateField;

class CollectionTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $defaultValidations = [
            'required' => ['status' => false, 'message' => null],
            'charcount' => ['status' => false, 'type' => null, 'min' => null, 'max' => null, 'message' => null],
            'unique' => ['status' => false, 'message' => null],
            'email' => ['message' => null],
            'number' => ['message' => null],
            'color' => ['message' => null],
        ];

        $defaultOptions = [
            'repeatable' => false,
            'hideInContentList' => false,
            'hiddenInAPI' => false,
        ];

        $create = function (string $name, string $slug, string $description, array $fields) use ($defaultValidations, $defaultOptions) {
            if (CollectionTemplate::where('slug', $slug)->exists()) return;

            $template = CollectionTemplate::create(compact('name', 'slug', 'description'));
            $order = 1;
            foreach ($fields as $field) {
                CollectionTemplateField::create(array_merge([
                    'options' => $defaultOptions,
                    'validations' => $defaultValidations,
                ], $field, [
                    'collection_template_id' => $template->id,
                    'order' => $order++,
                ]));
            }
        };

        $create('Blog Post', 'blog-post', 'Template for blog posts', [
            ['type'=>'text','label'=>'Title','name'=>'title'],
            ['type'=>'slug','label'=>'Slug','name'=>'slug','options'=>['slug'=>['field'=>'title','readonly'=>true]]],
            ['type'=>'richtext','label'=>'Content','name'=>'content'],
        ]);

        $create('Product', 'product', 'Template for products', [
            ['type'=>'text','label'=>'Name','name'=>'name'],
            ['type'=>'slug','label'=>'Slug','name'=>'slug','options'=>['slug'=>['field'=>'name','readonly'=>true]]],
            ['type'=>'number','label'=>'Price','name'=>'price'],
            ['type'=>'media','label'=>'Images','name'=>'images','options'=>['multiple'=>true]],
        ]);
    }
} 