<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['call_sign', 'email', 'password', 'privacy_policy_version', 'privacy_consented_at', 'newsletter_consent', 'newsletter_consent_version', 'newsletter_consented_at', 'newsletter_consent_recorded_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    public const PRIVACY_POLICY_VERSION = 'privacy-draft-2026-10-29';

    public const NEWSLETTER_CONSENT_VERSION = 'newsletter-consent-2026-10-29';

    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'privacy_consented_at' => 'immutable_datetime',
            'newsletter_consent' => 'boolean',
            'newsletter_consented_at' => 'immutable_datetime',
            'newsletter_consent_recorded_at' => 'immutable_datetime',
        ];
    }
}
