<?php

namespace App\Events;

use App\Models\ContentEntry;
use App\Models\Project;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ContentEvent
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $name;
    public Project $project;
    public ContentEntry $contentEntry;
    public string $source;

    public function __construct(string $name, Project $project, ContentEntry $contentEntry, string $source = 'cms')
    {
        $this->name = $name;
        $this->project = $project;
        $this->contentEntry = $contentEntry;
        $this->source = $source;
    }
} 