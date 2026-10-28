<?php

namespace App\Services;

use App\Models\LearningProgress;
use App\Models\User;
use App\Rules\LearningProgressDocument;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LearningProgressStore
{
    /** @return array{version: int, legacyCompletedMissionIds: list<string>, exerciseResults: object} */
    public function load(User $user): array
    {
        $document = LearningProgress::where('user_id', $user->id)->first()?->document
            ?? ['version' => 2, 'legacyCompletedMissionIds' => [], 'exerciseResults' => []];

        return $this->responseDocument($document);
    }

    /**
     * @param  array{version: int, legacyCompletedMissionIds: list<string>, exerciseResults: array<string, array<string, mixed>>}  $incoming
     * @return array{version: int, legacyCompletedMissionIds: list<string>, exerciseResults: object}
     */
    public function save(User $user, array $incoming): array
    {
        return DB::transaction(function () use ($user, $incoming): array {
            /** Lock the existing parent even on the first save, when no progress row can be locked. */
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $progress = LearningProgress::where('user_id', $user->id)->first();
            $current = $progress?->document ?? ['version' => 2, 'legacyCompletedMissionIds' => [], 'exerciseResults' => []];
            $current['legacyCompletedMissionIds'] = array_values(array_unique([...$current['legacyCompletedMissionIds'], ...$incoming['legacyCompletedMissionIds']]));
            foreach ($incoming['exerciseResults'] as $key => $result) {
                $previous = $current['exerciseResults'][$key] ?? null;
                if ($previous !== null) {
                    $result['solved'] = $previous['solved'] || $result['solved'];
                    $result['hintUsed'] = $previous['hintUsed'] || $result['hintUsed'];
                    $result['attempts'] = max($previous['attempts'], $result['attempts']);
                    foreach (['firstIndependentCorrect', 'firstSessionId', 'reviewFirstTryCorrect', 'reviewSessionId'] as $field) {
                        $result[$field] = $previous[$field] ?? $result[$field];
                    }
                    if ($previous['lastPracticedAt'] !== null && ($result['lastPracticedAt'] === null
                        || CarbonImmutable::parse($previous['lastPracticedAt'])->greaterThanOrEqualTo(CarbonImmutable::parse($result['lastPracticedAt'])))) {
                        $result['lastPracticedAt'] = $previous['lastPracticedAt'];
                    }
                }
                $current['exerciseResults'][$key] = $result;
            }
            if (count($current['legacyCompletedMissionIds']) > LearningProgressDocument::MAX_ENTRIES
                || count($current['exerciseResults']) > LearningProgressDocument::MAX_ENTRIES) {
                throw ValidationException::withMessages(['document' => ['The merged progress exceeds the entry limit.']]);
            }
            $document = $this->responseDocument($current);
            $progress ??= new LearningProgress(['user_id' => $user->id]);
            $progress->fill(['version' => 2, 'document' => $document])->save();

            return $document;
        }, 3);
    }

    /**
     * @param  array<string, mixed>  $document
     * @return array{version: int, legacyCompletedMissionIds: list<string>, exerciseResults: object}
     */
    private function responseDocument(array $document): array
    {
        return ['version' => 2, 'legacyCompletedMissionIds' => $document['legacyCompletedMissionIds'], 'exerciseResults' => (object) $document['exerciseResults']];
    }
}
