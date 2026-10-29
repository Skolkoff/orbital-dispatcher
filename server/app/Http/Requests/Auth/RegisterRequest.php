<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Rules\LearningProgressDocument;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
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
            'privacy_consent' => ['required', 'accepted'],
            'privacy_policy_version' => ['required', 'string', Rule::in([User::PRIVACY_POLICY_VERSION])],
            'newsletter_consent' => ['required', 'boolean'],
            'newsletter_consent_version' => ['required', 'string', Rule::in([User::NEWSLETTER_CONSENT_VERSION])],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'privacy_consent.required' => 'Для создания аккаунта нужно согласие на обработку персональных данных.',
            'privacy_consent.accepted' => 'Для создания аккаунта нужно согласие на обработку персональных данных.',
            'privacy_policy_version.*' => 'Документ изменился. Обнови страницу и ознакомься с текущей версией.',
            'newsletter_consent.*' => 'Проверь выбор согласия на рассылку.',
            'newsletter_consent_version.*' => 'Текст согласия изменился. Обнови страницу и проверь выбор.',
        ];
    }
}
