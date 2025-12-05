<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\{Project, Collection, Field, ContentEntry, ContentFieldValue};
use Carbon\Carbon;

class TranslationsExampleSeeder extends Seeder
{
    /**
     * Seed a project with translations example for Next.js starter
     */
    public function run(): void
    {
        /* ---------- Project ---------- */
        $project = Project::create([
            'name'           => 'Translations Example',
            'description'    => 'Multilingual blog example with translations',
            'default_locale' => 'en',
            'locales'        => ['en', 'fr', 'es'],
            'disk'           => 'public',
            'public_api'     => true,
        ]);

        /* ---------- Collection: Blog Posts ---------- */
        $posts = Collection::create([
            'project_id' => $project->id,
            'name'       => 'Blog Posts',
            'slug'       => 'blog-posts',
            'order'      => 1,
            'uuid'       => Str::uuid(),
        ]);

        /* ---------- Post Fields ---------- */
        $this->textField($posts, 'Title', 'title');
        $this->textField($posts, 'Slug', 'slug');
        $this->richtextField($posts, 'Content', 'content');
        $this->textField($posts, 'Excerpt', 'excerpt');
        $this->dateField($posts, 'Published Date', 'published_date');

        /* ---------- Create Sample Posts with Translations ---------- */
        $translationGroup1 = Str::uuid();
        $translationGroup2 = Str::uuid();
        $translationGroup3 = Str::uuid();

        // Post 1: "Welcome to Our Blog"
        $this->createTranslatedPost($posts, $translationGroup1, [
            'en' => [
                'title' => 'Welcome to Our Blog',
                'slug' => 'welcome-to-our-blog',
                'content' => '<p>This is our first blog post. We are excited to share our thoughts and ideas with you.</p>',
                'excerpt' => 'An introduction to our blog and what you can expect.',
                'published_date' => now()->subDays(5)->toDateString(),
            ],
            'fr' => [
                'title' => 'Bienvenue sur Notre Blog',
                'slug' => 'bienvenue-sur-notre-blog',
                'content' => '<p>Ceci est notre premier article de blog. Nous sommes ravis de partager nos pensées et nos idées avec vous.</p>',
                'excerpt' => 'Une introduction à notre blog et ce que vous pouvez attendre.',
                'published_date' => now()->subDays(5)->toDateString(),
            ],
            'es' => [
                'title' => 'Bienvenido a Nuestro Blog',
                'slug' => 'bienvenido-a-nuestro-blog',
                'content' => '<p>Esta es nuestra primera entrada del blog. Estamos emocionados de compartir nuestros pensamientos e ideas contigo.</p>',
                'excerpt' => 'Una introducción a nuestro blog y lo que puedes esperar.',
                'published_date' => now()->subDays(5)->toDateString(),
            ],
        ]);

        // Post 2: "Getting Started with Next.js"
        $this->createTranslatedPost($posts, $translationGroup2, [
            'en' => [
                'title' => 'Getting Started with Next.js',
                'slug' => 'getting-started-with-nextjs',
                'content' => '<p>Next.js is a powerful React framework that makes it easy to build modern web applications. In this post, we will explore the basics.</p>',
                'excerpt' => 'Learn the fundamentals of Next.js and start building amazing applications.',
                'published_date' => now()->subDays(3)->toDateString(),
            ],
            'fr' => [
                'title' => 'Commencer avec Next.js',
                'slug' => 'commencer-avec-nextjs',
                'content' => '<p>Next.js est un framework React puissant qui facilite la création d\'applications web modernes. Dans cet article, nous explorerons les bases.</p>',
                'excerpt' => 'Apprenez les fondamentaux de Next.js et commencez à créer des applications incroyables.',
                'published_date' => now()->subDays(3)->toDateString(),
            ],
            'es' => [
                'title' => 'Comenzando con Next.js',
                'slug' => 'comenzando-con-nextjs',
                'content' => '<p>Next.js es un potente framework de React que facilita la creación de aplicaciones web modernas. En esta entrada, exploraremos los conceptos básicos.</p>',
                'excerpt' => 'Aprende los fundamentos de Next.js y comienza a construir aplicaciones increíbles.',
                'published_date' => now()->subDays(3)->toDateString(),
            ],
        ]);

        // Post 3: "Building Multilingual Websites"
        $this->createTranslatedPost($posts, $translationGroup3, [
            'en' => [
                'title' => 'Building Multilingual Websites',
                'slug' => 'building-multilingual-websites',
                'content' => '<p>Creating websites that support multiple languages is essential in today\'s global market. Learn how to implement translations effectively.</p>',
                'excerpt' => 'A guide to building websites that speak multiple languages.',
                'published_date' => now()->subDays(1)->toDateString(),
            ],
            'fr' => [
                'title' => 'Créer des Sites Web Multilingues',
                'slug' => 'creer-des-sites-web-multilingues',
                'content' => '<p>Créer des sites web qui prennent en charge plusieurs langues est essentiel sur le marché mondial d\'aujourd\'hui. Apprenez à implémenter les traductions efficacement.</p>',
                'excerpt' => 'Un guide pour créer des sites web qui parlent plusieurs langues.',
                'published_date' => now()->subDays(1)->toDateString(),
            ],
            'es' => [
                'title' => 'Construyendo Sitios Web Multilingües',
                'slug' => 'construyendo-sitios-web-multilingues',
                'content' => '<p>Crear sitios web que admitan múltiples idiomas es esencial en el mercado global actual. Aprende a implementar traducciones de manera efectiva.</p>',
                'excerpt' => 'Una guía para construir sitios web que hablen múltiples idiomas.',
                'published_date' => now()->subDays(1)->toDateString(),
            ],
        ]);

        $this->command->info("Translations Example project created!");
        $this->command->info("Project UUID: {$project->uuid}");
        $this->command->info("Collection: blog-posts");
        $this->command->info("");
        $this->command->info("To get your Project ID for API access:");
        $this->command->info("1. Go to your ElmapiCMS admin panel");
        $this->command->info("2. Navigate to the 'Translations Example' project");
        $this->command->info("3. Go to Settings > API Access");
        $this->command->info("4. Copy the Project ID and use it in your .env file");
    }

    private function createTranslatedPost(Collection $collection, string $translationGroupId, array $translations): void
    {
        foreach ($translations as $locale => $data) {
            $entry = ContentEntry::create([
                'project_id' => $collection->project_id,
                'collection_id' => $collection->id,
                'locale' => $locale,
                'status' => 'published',
                'translation_group_id' => $translationGroupId,
                'published_at' => Carbon::parse($data['published_date']),
                'created_by' => 1,
                'updated_by' => 1,
            ]);

            // Title field
            $titleField = $collection->fields()->where('name', 'title')->first();
            if ($titleField) {
                ContentFieldValue::create([
                    'project_id' => $collection->project_id,
                    'collection_id' => $collection->id,
                    'content_entry_id' => $entry->id,
                    'field_id' => $titleField->id,
                    'field_type' => 'text',
                    'text_value' => $data['title'],
                ]);
            }

            // Slug field
            $slugField = $collection->fields()->where('name', 'slug')->first();
            if ($slugField) {
                ContentFieldValue::create([
                    'project_id' => $collection->project_id,
                    'collection_id' => $collection->id,
                    'content_entry_id' => $entry->id,
                    'field_id' => $slugField->id,
                    'field_type' => 'slug',
                    'text_value' => $data['slug'],
                ]);
            }

            // Content field
            $contentField = $collection->fields()->where('name', 'content')->first();
            if ($contentField) {
                ContentFieldValue::create([
                    'project_id' => $collection->project_id,
                    'collection_id' => $collection->id,
                    'content_entry_id' => $entry->id,
                    'field_id' => $contentField->id,
                    'field_type' => 'richtext',
                    'text_value' => $data['content'],
                ]);
            }

            // Excerpt field
            $excerptField = $collection->fields()->where('name', 'excerpt')->first();
            if ($excerptField) {
                ContentFieldValue::create([
                    'project_id' => $collection->project_id,
                    'collection_id' => $collection->id,
                    'content_entry_id' => $entry->id,
                    'field_id' => $excerptField->id,
                    'field_type' => 'text',
                    'text_value' => $data['excerpt'],
                ]);
            }

            // Published date field
            $dateField = $collection->fields()->where('name', 'published_date')->first();
            if ($dateField) {
                ContentFieldValue::create([
                    'project_id' => $collection->project_id,
                    'collection_id' => $collection->id,
                    'content_entry_id' => $entry->id,
                    'field_id' => $dateField->id,
                    'field_type' => 'date',
                    'date_value' => Carbon::parse($data['published_date']),
                ]);
            }
        }
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
}

