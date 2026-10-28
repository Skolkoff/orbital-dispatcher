<?php

namespace Tests\Feature\Progress;

use App\Models\LearningProgress;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class ProgressTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeaders(['Origin' => 'http://localhost:5173']);
    }

    private function snapshot(array $result = [], array $legacy = []): array
    {
        return ['version' => 2, 'legacyCompletedMissionIds' => $legacy, 'exerciseResults' => [
            'coordinates-exercise-1' => array_replace([
                'solved' => true, 'attempts' => 2, 'firstIndependentCorrect' => false,
                'hintUsed' => true, 'firstSessionId' => 'session-first',
                'lastPracticedAt' => '2026-10-28T12:00:00.000Z',
                'reviewFirstTryCorrect' => true, 'reviewSessionId' => 'session-review',
            ], $result),
        ]];
    }

    public function test_progress_requires_authentication(): void
    {
        $this->getJson('/api/progress')->assertUnauthorized();
        $this->putJson('/api/progress', $this->snapshot())->assertUnauthorized();
    }

    public function test_empty_load_and_save_round_trip_one_mysql_json_row(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->getJson('/api/progress')->assertOk()
            ->assertContent('{"version":2,"legacyCompletedMissionIds":[],"exerciseResults":{}}');
        $this->putJson('/api/progress', $this->snapshot())->assertOk()->assertExactJson($this->snapshot());
        $this->putJson('/api/progress', $this->snapshot())->assertOk();
        $this->getJson('/api/progress')->assertOk()->assertExactJson($this->snapshot());
        $this->assertDatabaseCount('learning_progress', 1);
        $this->assertDatabaseHas('learning_progress', ['user_id' => $user->id, 'version' => 2]);
        $this->assertSame('OBJECT', DB::scalar('select JSON_TYPE(document) from learning_progress where user_id = ?', [$user->id]));
    }

    public function test_empty_document_is_accepted_with_object_shape(): void
    {
        $empty = ['version' => 2, 'legacyCompletedMissionIds' => [], 'exerciseResults' => (object) []];
        $this->actingAs(User::factory()->create())->putJson('/api/progress', $empty)->assertOk()
            ->assertContent('{"version":2,"legacyCompletedMissionIds":[],"exerciseResults":{}}');
        $this->getJson('/api/progress')->assertOk()
            ->assertContent('{"version":2,"legacyCompletedMissionIds":[],"exerciseResults":{}}');
    }

    public function test_old_conflicting_and_empty_snapshots_cannot_erase_evidence(): void
    {
        $this->actingAs(User::factory()->create())->putJson('/api/progress', $this->snapshot([], ['mission-1']))->assertOk();
        $older = $this->snapshot([
            'solved' => false, 'attempts' => 1, 'hintUsed' => false,
            'firstIndependentCorrect' => true, 'firstSessionId' => 'conflicting-first',
            'lastPracticedAt' => '2026-10-27T23:00:00.000Z',
            'reviewFirstTryCorrect' => false, 'reviewSessionId' => 'conflicting-review',
        ], ['mission-2', 'mission-1']);
        $this->putJson('/api/progress', $older)->assertOk()->assertExactJson($this->snapshot([], ['mission-1', 'mission-2']));
        $this->putJson('/api/progress', ['version' => 2, 'legacyCompletedMissionIds' => [], 'exerciseResults' => (object) []])->assertOk()
            ->assertExactJson($this->snapshot([], ['mission-1', 'mission-2']));
    }

    public function test_merge_accepts_new_evidence_and_uses_absolute_time_and_highest_attempts(): void
    {
        $this->actingAs(User::factory()->create())->putJson('/api/progress', $this->snapshot([
            'solved' => false, 'hintUsed' => false, 'firstIndependentCorrect' => null,
            'firstSessionId' => null, 'lastPracticedAt' => null,
            'reviewFirstTryCorrect' => null, 'reviewSessionId' => null,
        ]))->assertOk();
        $this->putJson('/api/progress', $this->snapshot(['attempts' => 5]))->assertOk()->assertExactJson($this->snapshot(['attempts' => 5]));
        $this->putJson('/api/progress', $this->snapshot(['lastPracticedAt' => '2026-10-28T13:00:00+02:00']))->assertOk()
            ->assertJsonPath('exerciseResults.coordinates-exercise-1.lastPracticedAt', '2026-10-28T12:00:00.000Z');
    }

    public function test_owner_is_derived_from_session_only(): void
    {
        $first = User::factory()->create();
        $second = User::factory()->create();
        $this->actingAs($first)->putJson('/api/progress', $this->snapshot())->assertOk();
        $this->actingAs($second)->getJson('/api/progress?user_id='.$first->id)->assertOk()->assertJsonCount(0, 'exerciseResults');
        $this->putJson('/api/progress', array_merge($this->snapshot(), ['user_id' => $first->id]))->assertUnprocessable();
        $this->putJson('/api/progress', $this->snapshot(['solved' => false]))->assertOk();
        $this->actingAs($first)->getJson('/api/progress')->assertOk()->assertJsonPath('exerciseResults.coordinates-exercise-1.solved', true);
        $this->assertDatabaseCount('learning_progress', 2);
    }

    #[DataProvider('invalidDocuments')]
    public function test_rejects_invalid_schema_without_writing(array $patch): void
    {
        $document = array_replace_recursive($this->snapshot(), $patch);
        $this->actingAs(User::factory()->create())->putJson('/api/progress', $document)->assertUnprocessable();
        $this->assertDatabaseCount('learning_progress', 0);
    }

    public static function invalidDocuments(): array
    {
        $bad = fn (array $value): array => [['exerciseResults' => ['coordinates-exercise-1' => $value]]];

        return [
            'wrong version' => [['version' => 1]], 'string version' => [['version' => '2']],
            'legacy not strings' => [['legacyCompletedMissionIds' => [12]]],
            'zero attempts' => $bad(['attempts' => 0]), 'huge attempts' => $bad(['attempts' => 1000001]),
            'string attempts' => $bad(['attempts' => '2']), 'fractional attempts' => $bad(['attempts' => 1.5]),
            'string boolean' => $bad(['solved' => 'true']), 'numeric boolean' => $bad(['hintUsed' => 1]),
            'invalid nullable boolean' => $bad(['firstIndependentCorrect' => 'false']),
            'invalid review boolean' => $bad(['reviewFirstTryCorrect' => 1]),
            'invalid timestamp' => $bad(['lastPracticedAt' => 'yesterday']),
            'invalid calendar date' => $bad(['lastPracticedAt' => '2026-02-30T00:00:00Z']),
            'timestamp without zone' => $bad(['lastPracticedAt' => '2026-10-28T12:00:00']),
            'session not string' => $bad(['firstSessionId' => 1]),
            'session too long' => $bad(['reviewSessionId' => str_repeat('a', 129)]),
            'unrecognized grading field' => $bad(['correct' => true]),
            'unrecognized owner' => [['user_id' => 1]],
        ];
    }

    public function test_required_fields_keys_and_counts_are_validated(): void
    {
        $this->actingAs(User::factory()->create());
        foreach (['version', 'legacyCompletedMissionIds', 'exerciseResults'] as $field) {
            $document = $this->snapshot();
            unset($document[$field]);
            $this->putJson('/api/progress', $document)->assertUnprocessable();
        }
        foreach (array_keys($this->snapshot()['exerciseResults']['coordinates-exercise-1']) as $field) {
            $document = $this->snapshot();
            unset($document['exerciseResults']['coordinates-exercise-1'][$field]);
            $this->putJson('/api/progress', $document)->assertUnprocessable();
        }
        foreach (['bad.key', '../exercise', str_repeat('a', 129), ''] as $key) {
            $document = $this->snapshot();
            $document['exerciseResults'] = [$key => $document['exerciseResults']['coordinates-exercise-1']];
            $this->putJson('/api/progress', $document)->assertUnprocessable();
        }
        $document = $this->snapshot();
        $document['exerciseResults'] = array_fill(0, 2, $document['exerciseResults']['coordinates-exercise-1']);
        $this->putJson('/api/progress', $document)->assertUnprocessable();
        $document['exerciseResults'] = [];
        $this->putJson('/api/progress', $document)->assertUnprocessable();
        $document['exerciseResults'] = (object) [];
        $document['legacyCompletedMissionIds'] = array_map(fn (int $i): string => 'mission-'.$i, range(1, 1001));
        $this->putJson('/api/progress', $document)->assertUnprocessable();
        $document = $this->snapshot();
        $document['exerciseResults'] = array_combine(array_map(fn (int $i): string => 'exercise-'.$i, range(1, 1001)), array_fill(0, 1001, $document['exerciseResults']['coordinates-exercise-1']));
        $this->putJson('/api/progress', $document)->assertUnprocessable();
        $this->assertDatabaseCount('learning_progress', 0);
    }

    public function test_registration_imports_progress_and_rejects_bad_import_before_creation(): void
    {
        $registration = ['email' => 'new@example.com', 'call_sign' => 'Pilot', 'password' => 'strong-password', 'password_confirmation' => 'strong-password'];
        $this->postJson('/api/register', $registration + ['progress' => ['version' => 1]])->assertUnprocessable()->assertJsonValidationErrors('progress');
        $this->assertDatabaseCount('users', 0);
        $this->postJson('/api/register', $registration + ['progress' => $this->snapshot()])->assertCreated();
        $this->getJson('/api/progress')->assertOk()->assertExactJson($this->snapshot());
        $this->assertDatabaseCount('learning_progress', 1);
    }

    public function test_failed_import_rolls_back_account_creation(): void
    {
        LearningProgress::creating(function (): void {
            throw new RuntimeException('Simulated progress write failure');
        });
        try {
            $this->postJson('/api/register', ['email' => 'rollback@example.com', 'call_sign' => 'Pilot', 'password' => 'strong-password', 'password_confirmation' => 'strong-password', 'progress' => $this->snapshot()])->assertStatus(500);
            $this->assertDatabaseMissing('users', ['email' => 'rollback@example.com']);
            $this->assertDatabaseCount('learning_progress', 0);
            $this->assertGuest('web');
        } finally {
            LearningProgress::flushEventListeners();
        }
    }
}
