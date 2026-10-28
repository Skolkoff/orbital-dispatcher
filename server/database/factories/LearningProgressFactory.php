<?php

namespace Database\Factories;

use App\Models\LearningProgress;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<LearningProgress> */
class LearningProgressFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'version' => 2,
            'document' => ['version' => 2, 'legacyCompletedMissionIds' => [], 'exerciseResults' => (object) []],
        ];
    }
}
