<?php

namespace App\Http\Requests\Auth;

use App\Rules\LearningProgressDocument;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    use NormalizesEmail;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $body = json_decode($this->getContent());

        return [
            'progress' => ['sometimes', 'required', new LearningProgressDocument(is_object($body) ? ($body->progress ?? null) : null)],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'call_sign' => ['required', 'string', 'min:2', 'max:24'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)],
        ];
    }
}
