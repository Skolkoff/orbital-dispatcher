<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('privacy_policy_version', 64)->nullable();
            $table->timestamp('privacy_consented_at')->nullable();
            $table->boolean('newsletter_consent')->nullable();
            $table->string('newsletter_consent_version', 64)->nullable();
            $table->timestamp('newsletter_consented_at')->nullable();
            $table->timestamp('newsletter_consent_recorded_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['privacy_policy_version', 'privacy_consented_at', 'newsletter_consent', 'newsletter_consent_version', 'newsletter_consented_at', 'newsletter_consent_recorded_at']);
        });
    }
};
