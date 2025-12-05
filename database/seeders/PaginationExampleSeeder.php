<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\{Project, Collection, Field, ContentEntry, ContentFieldValue};
use Carbon\Carbon;

class PaginationExampleSeeder extends Seeder
{
    /**
     * Seed a project with pagination example data
     */
    public function run(): void
    {
        /* ---------- Project ---------- */
        $project = Project::create([
            'name'           => 'Pagination Example',
            'description'    => 'Example project demonstrating advanced pagination features',
            'default_locale' => 'en',
            'locales'        => ['en'],
            'disk'           => 'public',
            'public_api'     => true,
        ]);

        /* ---------- Collection: Articles ---------- */
        $articles = Collection::create([
            'project_id' => $project->id,
            'name'       => 'Articles',
            'slug'       => 'articles',
            'order'      => 1,
            'uuid'       => Str::uuid(),
        ]);

        /* ---------- Article Fields ---------- */
        $this->textField($articles, 'Title', 'title');
        $this->textField($articles, 'Slug', 'slug');
        $this->richtextField($articles, 'Content', 'content');
        $this->textField($articles, 'Excerpt', 'excerpt');
        $this->dateField($articles, 'Published Date', 'published_date');
        $this->numberField($articles, 'Views', 'views');
        $this->textField($articles, 'Category', 'category');

        /* ---------- Create 100 Sample Articles ---------- */
        $categories = ['Technology', 'Science', 'Business', 'Health', 'Education'];
        
        for ($i = 1; $i <= 100; $i++) {
            $category = $categories[array_rand($categories)];
            $publishedDate = now()->subDays(rand(0, 365));
            
            $entry = ContentEntry::create([
                'project_id' => $articles->project_id,
                'collection_id' => $articles->id,
                'locale' => 'en',
                'status' => 'published',
                'published_at' => $publishedDate,
                'created_by' => 1,
                'updated_by' => 1,
            ]);

            // Title
            $titleField = $articles->fields()->where('name', 'title')->first();
            if ($titleField) {
                ContentFieldValue::create([
                    'project_id' => $articles->project_id,
                    'collection_id' => $articles->id,
                    'content_entry_id' => $entry->id,
                    'field_id' => $titleField->id,
                    'field_type' => 'text',
                    'text_value' => "Article {$i}: Understanding {$category} in the Modern World",
                ]);
            }

            // Slug
            $slugField = $articles->fields()->where('name', 'slug')->first();
            if ($slugField) {
                ContentFieldValue::create([
                    'project_id' => $articles->project_id,
                    'collection_id' => $articles->id,
                    'content_entry_id' => $entry->id,
                    'field_id' => $slugField->id,
                    'field_type' => 'slug',
                    'text_value' => "article-{$i}-understanding-{$category}-modern-world",
                ]);
            }

            // Content
            $contentField = $articles->fields()->where('name', 'content')->first();
            if ($contentField) {
                ContentFieldValue::create([
                    'project_id' => $articles->project_id,
                    'collection_id' => $articles->id,
                    'content_entry_id' => $entry->id,
                    'field_id' => $contentField->id,
                    'field_type' => 'richtext',
                    'text_value' => "<p>This is article number {$i} about {$category}. It contains detailed information and insights about the topic. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p><p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>",
                ]);
            }

            // Excerpt
            $excerptField = $articles->fields()->where('name', 'excerpt')->first();
            if ($excerptField) {
                ContentFieldValue::create([
                    'project_id' => $articles->project_id,
                    'collection_id' => $articles->id,
                    'content_entry_id' => $entry->id,
                    'field_id' => $excerptField->id,
                    'field_type' => 'text',
                    'text_value' => "A comprehensive guide to {$category} and its impact on modern society. Article {$i}.",
                ]);
            }

            // Published Date
            $dateField = $articles->fields()->where('name', 'published_date')->first();
            if ($dateField) {
                ContentFieldValue::create([
                    'project_id' => $articles->project_id,
                    'collection_id' => $articles->id,
                    'content_entry_id' => $entry->id,
                    'field_id' => $dateField->id,
                    'field_type' => 'date',
                    'date_value' => $publishedDate,
                ]);
            }

            // Views
            $viewsField = $articles->fields()->where('name', 'views')->first();
            if ($viewsField) {
                ContentFieldValue::create([
                    'project_id' => $articles->project_id,
                    'collection_id' => $articles->id,
                    'content_entry_id' => $entry->id,
                    'field_id' => $viewsField->id,
                    'field_type' => 'number',
                    'number_value' => rand(100, 10000),
                ]);
            }

            // Category
            $categoryField = $articles->fields()->where('name', 'category')->first();
            if ($categoryField) {
                ContentFieldValue::create([
                    'project_id' => $articles->project_id,
                    'collection_id' => $articles->id,
                    'content_entry_id' => $entry->id,
                    'field_id' => $categoryField->id,
                    'field_type' => 'text',
                    'text_value' => $category,
                ]);
            }
        }

        $this->command->info("Pagination Example project created!");
        $this->command->info("Project UUID: {$project->uuid}");
        $this->command->info("Collection: articles");
        $this->command->info("Total Articles: 100");
        $this->command->info("");
        $this->command->info("To get your Project ID for API access:");
        $this->command->info("1. Go to your ElmapiCMS admin panel");
        $this->command->info("2. Navigate to the 'Pagination Example' project");
        $this->command->info("3. Go to Settings > API Access");
        $this->command->info("4. Copy the Project ID and use it in your .env file");
    }

    private function textField(Collection $collection, string $label, string $name): Field
    {
        return Field::create([
            'project_id' => $collection->project_id,
            'collection_id' => $collection->id,
            'name' => $name,
            'label' => $label,
            'type' => 'text',
            'order' => Field::where('collection_id', $collection->id)->count() + 1,
            'uuid' => Str::uuid(),
        ]);
    }

    private function richtextField(Collection $collection, string $label, string $name): Field
    {
        return Field::create([
            'project_id' => $collection->project_id,
            'collection_id' => $collection->id,
            'name' => $name,
            'label' => $label,
            'type' => 'richtext',
            'order' => Field::where('collection_id', $collection->id)->count() + 1,
            'uuid' => Str::uuid(),
            'options' => [
                'editor' => ['type' => 1],
            ],
        ]);
    }

    private function dateField(Collection $collection, string $label, string $name, array $options = []): Field
    {
        return Field::create([
            'project_id' => $collection->project_id,
            'collection_id' => $collection->id,
            'name' => $name,
            'label' => $label,
            'type' => 'date',
            'order' => Field::where('collection_id', $collection->id)->count() + 1,
            'uuid' => Str::uuid(),
            'options' => $options,
        ]);
    }

    private function numberField(Collection $collection, string $label, string $name): Field
    {
        return Field::create([
            'project_id' => $collection->project_id,
            'collection_id' => $collection->id,
            'name' => $name,
            'label' => $label,
            'type' => 'number',
            'order' => Field::where('collection_id', $collection->id)->count() + 1,
            'uuid' => Str::uuid(),
        ]);
    }
}

