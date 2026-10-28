<?php

namespace App\Http\Requests\Progress;

use App\Rules\LearningProgressDocument;
use Illuminate\Foundation\Http\FormRequest;

class SaveProgressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['document' => ['required', new LearningProgressDocument(json_decode($this->getContent()))]];
    }

    /** @return array<string, mixed> */
    public function validationData(): array
    {
        return ['document' => $this->json()->all()];
    }

    /** @return array{version: int, legacyCompletedMissionIds: list<string>, exerciseResults: array<string, array<string, mixed>>} */
    public function document(): array
    {
        return json_decode($this->getContent(), true);
    }
}
