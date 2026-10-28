<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use stdClass;

/** Validates self-reported history, never authoritative grades. */
class LearningProgressDocument implements ValidationRule
{
    public const MAX_ENTRIES = 1000;

    public function __construct(private mixed $document) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $this->validDocument($this->document)) {
            $fail('The :attribute must be a valid version 2 learning progress document.');
        }
    }

    private function validDocument(mixed $document): bool
    {
        if (! $document instanceof stdClass || ! $this->hasExactly($document, ['version', 'legacyCompletedMissionIds', 'exerciseResults'])
            || $document->version !== 2 || ! is_array($document->legacyCompletedMissionIds)
            || count($document->legacyCompletedMissionIds) > self::MAX_ENTRIES
            || ! $document->exerciseResults instanceof stdClass
            || count(get_object_vars($document->exerciseResults)) > self::MAX_ENTRIES) {
            return false;
        }
        foreach ($document->legacyCompletedMissionIds as $id) {
            if (! $this->validIdentifier($id)) {
                return false;
            }
        }
        foreach (get_object_vars($document->exerciseResults) as $key => $result) {
            if (! is_string($key) || ! $this->validIdentifier($key) || ! preg_match('/\A[a-z][a-z0-9]*(?:-[a-z0-9]+)*\z/', $key)
                || ! $this->validResult($result)) {
                return false;
            }
        }

        return true;
    }

    private function validResult(mixed $result): bool
    {
        if (! $result instanceof stdClass || ! $this->hasExactly($result, [
            'solved', 'attempts', 'firstIndependentCorrect', 'hintUsed', 'firstSessionId',
            'lastPracticedAt', 'reviewFirstTryCorrect', 'reviewSessionId',
        ])) {
            return false;
        }

        return is_bool($result->solved) && is_bool($result->hintUsed)
            && is_int($result->attempts) && $result->attempts >= 1 && $result->attempts <= 1000000
            && ($result->firstIndependentCorrect === null || is_bool($result->firstIndependentCorrect))
            && ($result->reviewFirstTryCorrect === null || is_bool($result->reviewFirstTryCorrect))
            && ($result->firstSessionId === null || $this->validIdentifier($result->firstSessionId))
            && ($result->reviewSessionId === null || $this->validIdentifier($result->reviewSessionId))
            && ($result->lastPracticedAt === null || $this->validTimestamp($result->lastPracticedAt));
    }

    private function validIdentifier(mixed $value): bool
    {
        return is_string($value) && trim($value) !== '' && mb_strlen($value) <= 128;
    }

    private function validTimestamp(mixed $value): bool
    {
        if (! is_string($value) || ! preg_match('/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)\z/', $value)) {
            return false;
        }
        $parsed = date_parse($value);

        return $parsed['error_count'] === 0 && $parsed['warning_count'] === 0;
    }

    /** @param list<string> $keys */
    private function hasExactly(stdClass $value, array $keys): bool
    {
        $actual = array_keys(get_object_vars($value));
        sort($actual);
        sort($keys);

        return $actual === $keys;
    }
}
