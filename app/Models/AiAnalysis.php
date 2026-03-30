<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiAnalysis extends Model
{
    protected $fillable = [
        'user_id',
        'month',
        'year',
        'result',
        'health_score',
    ];

    protected function casts(): array
    {
        return [
            'result' => 'array',
        ];
    }
}
