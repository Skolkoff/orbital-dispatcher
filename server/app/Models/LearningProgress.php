<?php

namespace App\Models;

use Database\Factories\LearningProgressFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'version', 'document'])]
class LearningProgress extends Model
{
    /** @use HasFactory<LearningProgressFactory> */
    use HasFactory;

    protected $table = 'learning_progress';

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['version' => 'integer', 'document' => 'array'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
