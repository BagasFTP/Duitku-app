<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class ReceiptScan extends Model
{
    protected $appends = ['image_url'];

    protected $fillable = [
        'user_id',
        'category_id',
        'transaction_id',
        'image_path',
        'amount',
        'description',
        'date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'date'   => 'date',
            'amount' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image_path) return null;
        return asset('storage/' . $this->image_path);
    }
}
