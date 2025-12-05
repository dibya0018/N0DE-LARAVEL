<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ProjectTemplate;

class ProjectTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templatesDir = resource_path('data/project_templates');
        
        // Check if directory exists
        if (!is_dir($templatesDir)) {
            // Fallback to old single file format for backwards compatibility
        $path = resource_path('data/project_templates.json');
            if (file_exists($path)) {
                $templates = json_decode(file_get_contents($path), true) ?? [];
                $this->processTemplates($templates);
            }
            return;
        }

        // Load all JSON files from the directory
        $files = glob($templatesDir . '/*.json');
        $templates = [];

        foreach ($files as $file) {
            $template = json_decode(file_get_contents($file), true);
            if ($template && is_array($template)) {
                $templates[] = $template;
            }
        }

        $this->processTemplates($templates);
    }

    protected function processTemplates(array $templates): void
    {
        foreach ($templates as $tpl) {
            if (empty($tpl['slug'])) {
                continue;
            }

            ProjectTemplate::updateOrCreate(
                ['slug' => $tpl['slug']],
                [
                    'name' => $tpl['name'] ?? $tpl['slug'],
                    'description' => $tpl['description'] ?? null,
                    'has_demo_data' => $tpl['has_demo_data'] ?? false,
                    'data' => $tpl,
                ]
            );
        }
    }
} 