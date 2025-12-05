<?php

namespace App\Jobs;

use App\Models\Webhook;
use App\Models\WebhookLog;
use Illuminate\Bus\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;

class SendWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public Webhook $webhook;
    public array $payload;

    public function __construct(Webhook $webhook, array $payload)
    {
        $this->webhook = $webhook;
        $this->payload = $payload;
    }

    public function handle(): void
    {
        $payload = $this->payload;

        $signature = null;
        if ($this->webhook->secret) {
            $signature = hash_hmac('sha256', json_encode($payload), $this->webhook->secret);
        }

        try {
            $response = Http::timeout(10)
                ->withHeaders($signature ? ['X-Webhook-Signature' => $signature] : [])
                ->post($this->webhook->url, $payload);

            $status = $response->status();
            $responseBody = $response->body();
        } catch (\Throwable $e) {
            $status = 'error';
            $responseBody = $e->getMessage();
        }

        WebhookLog::create([
            'project_uuid' => $payload['project_uuid'],
            'webhook_id' => $this->webhook->id,
            'action' => $payload['event'] ?? 'unknown',
            'url' => $this->webhook->url,
            'status' => $status,
            'request' => $payload,
            'response' => $responseBody,
        ]);
    }

    public int $tries = 3;
    public int $backoff = 30; // seconds
} 