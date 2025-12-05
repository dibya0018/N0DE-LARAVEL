<?php

namespace App\Listeners;

use App\Events\ContentEvent;
use App\Jobs\SendWebhookJob;
use Illuminate\Support\Facades\Log;
use App\Http\Resources\ContentEntryResource;

class DispatchProjectWebhooks
{
    public function handle(ContentEvent $event): void
    {
        $project = $event->project;
        
        $collectionId = $event->contentEntry->collection_id;
        $webhooks = $project->webhooks()->where('status', true)->get();

        foreach ($webhooks as $webhook) {
            // Check event match
            if(!in_array($event->name, $webhook->events ?? [])) continue;
            // Check source match
            if(!in_array($event->source, $webhook->sources ?? [])) continue;
            // Check collection filter
            if(!empty($webhook->collection_ids) && !in_array($collectionId, $webhook->collection_ids)) continue;

            $payload = [
                'event' => $event->name,
                'project_uuid' => $project->uuid,
                'collection_id' => $event->contentEntry->collection_id,
                'content_id' => $event->contentEntry->id,
            ];

            if(in_array($event->name, ['content.created','content.updated','content.published','content.unpublished'])){
                $entry = $event->contentEntry->load([
                    'fieldValues.field',
                    'fieldValues.mediaRelations.asset.metadata',
                    'fieldValues.valueRelations.related',
                ]);
                $payload['content_entry'] = ContentEntryResource::make($entry)->resolve();
            }

            SendWebhookJob::dispatch($webhook, $payload)->onQueue('webhooks');
        }
    }
} 