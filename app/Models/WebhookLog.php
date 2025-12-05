<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class WebhookLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_uuid',
        'webhook_id',
        'action',
        'url',
        'status',
        'request',
        'response',
    ];

    protected $casts = [
        'request'  => 'array',
        'response' => 'array',
        'id' => 'integer',
        'webhook_id' => 'integer',
    ];

    public function webhook(): BelongsTo
    {
        return $this->belongsTo(Webhook::class);
    }
} 