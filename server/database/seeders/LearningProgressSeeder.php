<?php

namespace Database\Seeders;

use App\Models\LearningProgress;
use Illuminate\Database\Seeder;

class LearningProgressSeeder extends Seeder
{
    public function run(): void
    {
        LearningProgress::factory()->create();
    }
}
