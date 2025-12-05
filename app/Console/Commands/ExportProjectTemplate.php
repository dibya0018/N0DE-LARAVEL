<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Project;
use App\Models\Collection as CollectionModel;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use App\Services\ProjectTemplateBuilder;

class ExportProjectTemplate extends Command
{
    protected $signature = 'project:export-template {projectId} {--demo : Include published demo data} {--output= : Output file, defaults to storage/app/project_template_<id>.json}';
    protected $description = 'Export a project (collections, fields, optional demo data) into project_templates.json block format';

    public function handle()
    {
        $projectId = (int) $this->argument('projectId');
        $withDemo  = $this->option('demo');
        $output    = $this->option('output') ?? storage_path("project_template_{$projectId}.json");

        $project = Project::find($projectId);
        if (!$project) {
            $this->error("Project #{$projectId} not found.");
            return 1;
        }

        $template = ProjectTemplateBuilder::build($project, Str::slug($project->name), $project->name, null, $withDemo);

        $json = json_encode($template, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            $this->error('Failed to encode JSON');
            return 1;
        }

        file_put_contents($output, $json);
        $this->info("Template exported to {$output}");
        return 0;
    }
} 