<?php

namespace Tests\Feature\Auth;

use App\Models\LearningProgress;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Tests\TestCase;

class AccountTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeaders(['Origin' => 'http://localhost:5173']);
    }

    private function registration(array $overrides = []): array
    {
        return array_replace(['email' => ' Learner@Example.com ', 'call_sign' => 'Орбита', 'password' => 'strong-password', 'password_confirmation' => 'strong-password'], $overrides);
    }

    public function test_registration_normalizes_email_hashes_password_returns_safe_fields_and_rotates_session(): void
    {
        $this->getJson('/sanctum/csrf-cookie');
        $sessionId = session()->getId();
        $response = $this->postJson('/api/register', $this->registration())->assertCreated();
        $user = User::firstOrFail();
        $response->assertExactJson(['data' => ['id' => $user->id, 'email' => 'learner@example.com', 'call_sign' => 'Орбита']]);
        $this->assertTrue(Hash::check('strong-password', $user->password));
        $this->assertAuthenticatedAs($user);
        $this->assertNotSame($sessionId, session()->getId());
    }

    public function test_registration_validates_required_fields_call_sign_password_and_unique_normalized_email(): void
    {
        $this->postJson('/api/register', [])->assertUnprocessable()->assertJsonValidationErrors(['email', 'call_sign', 'password']);
        $this->postJson('/api/register', $this->registration(['call_sign' => 'a', 'password' => 'short']))->assertUnprocessable()->assertJsonValidationErrors(['call_sign', 'password']);
        $this->postJson('/api/register', $this->registration(['call_sign' => str_repeat('a', 25)]))->assertUnprocessable()->assertJsonValidationErrors('call_sign');
        $this->postJson('/api/register', $this->registration())->assertCreated();
        $this->postJson('/api/register', $this->registration(['email' => 'LEARNER@example.com']))->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_login_current_user_and_logout_manage_session(): void
    {
        $user = User::factory()->create();
        $this->getJson('/api/user')->assertUnauthorized();
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong'])->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->getJson('/sanctum/csrf-cookie');
        $sessionId = session()->getId();
        $this->postJson('/api/login', ['email' => ' '.strtoupper($user->email).' ', 'password' => 'password'])->assertOk()->assertJsonPath('data.id', $user->id)->assertJsonMissingPath('data.password');
        $this->assertNotSame($sessionId, session()->getId());
        $this->getJson('/api/user')->assertOk()->assertJsonPath('data.id', $user->id);
        $sessionId = session()->getId();
        $token = session()->token();
        $this->postJson('/api/logout')->assertNoContent();
        $this->assertGuest('web');
        $this->app['auth']->forgetGuards();
        $this->assertNotSame($sessionId, session()->getId());
        $this->assertNotSame($token, session()->token());
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_forgot_password_is_generic_and_issues_a_hashed_reset_token_with_spa_url(): void
    {
        Notification::fake();
        config(['app.spa_url' => 'http://localhost:5173']);
        $user = User::factory()->create(['email' => 'learner+test@example.com']);
        $known = $this->postJson('/api/forgot-password', ['email' => ' LEARNER+TEST@example.com '])->assertOk();
        $unknown = $this->postJson('/api/forgot-password', ['email' => 'unknown@example.com'])->assertOk();
        $this->assertSame($known->json(), $unknown->json());
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk()->assertExactJson($known->json());
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user): bool {
            $this->assertTrue(Password::tokenExists($user, $notification->token));
            $this->assertNotSame($notification->token, DB::table('password_reset_tokens')->where('email', $user->email)->value('token'));
            $this->assertSame('http://localhost:5173/#/reset-password/'.$notification->token.'?email=learner%2Btest%40example.com', $notification->toMail($user)->actionUrl);

            return true;
        });
    }

    public function test_password_reset_accepts_valid_token_and_rejects_invalid_expired_and_reused_tokens(): void
    {
        $user = User::factory()->create();
        $token = Password::createToken($user);
        $payload = ['email' => ' '.strtoupper($user->email).' ', 'token' => $token, 'password' => 'new-strong-password', 'password_confirmation' => 'new-strong-password'];
        $this->postJson('/api/reset-password', array_replace($payload, ['token' => 'invalid']))->assertUnprocessable();
        DB::table('password_reset_tokens')->where('email', $user->email)->update(['created_at' => now()->subMinutes(61)]);
        $this->postJson('/api/reset-password', $payload)->assertUnprocessable();
        $payload['token'] = Password::createToken($user);
        $this->postJson('/api/reset-password', array_replace($payload, ['password_confirmation' => 'different']))->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->postJson('/api/reset-password', $payload)->assertOk();
        $this->assertTrue(Hash::check('new-strong-password', $user->fresh()->password));
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
        $this->postJson('/api/reset-password', $payload)->assertUnprocessable();
    }

    public function test_account_endpoints_are_rate_limited(): void
    {
        foreach (['register', 'login', 'forgot-password', 'reset-password'] as $endpoint) {
            for ($attempt = 0; $attempt < 10; $attempt++) {
                $this->postJson('/api/'.$endpoint, [])->assertUnprocessable();
            }
            $this->postJson('/api/'.$endpoint, [])->assertTooManyRequests();
        }
    }

    public function test_deletion_requires_authentication_and_current_password(): void
    {
        $this->deleteJson('/api/user')->assertUnauthorized();
        $user = User::factory()->create();
        $this->actingAs($user)->deleteJson('/api/user', ['password' => 'wrong'])->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->assertModelExists($user);
    }

    public function test_deletion_removes_user_reset_tokens_and_all_owned_sessions_and_invalidates_current_session(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        LearningProgress::factory()->create(['user_id' => $user->id]);
        LearningProgress::factory()->create(['user_id' => $other->id]);
        Password::createToken($user);
        foreach (['owned-a' => $user->id, 'owned-b' => $user->id, 'unrelated' => $other->id] as $id => $userId) {
            DB::table('sessions')->insert(['id' => $id, 'user_id' => $userId, 'payload' => '', 'last_activity' => time()]);
        }
        $this->actingAs($user)->getJson('/api/user');
        $sessionId = session()->getId();
        $this->deleteJson('/api/user', ['password' => 'password'])->assertNoContent();
        $this->assertGuest('web');
        $this->app['auth']->forgetGuards();
        $this->assertNotSame($sessionId, session()->getId());
        $this->assertModelMissing($user);
        $this->assertDatabaseMissing('learning_progress', ['user_id' => $user->id]);
        $this->assertDatabaseHas('learning_progress', ['user_id' => $other->id]);
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
        $this->assertDatabaseHas('sessions', ['user_id' => $other->id]);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_old_database_session_cannot_authenticate_after_logout_or_account_deletion(): void
    {
        config(['session.driver' => 'database']);
        $this->withCredentials();
        foreach (['logout', 'delete'] as $action) {
            $user = User::factory()->create();
            $this->newClient();
            $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])->assertOk();
            $oldId = session()->getId();
            $this->assertDatabaseHas('sessions', ['id' => $oldId, 'user_id' => $user->id]);
            if ($action === 'delete') {
                $otherSessionId = Str::random(40);
                $otherSession = (array) DB::table('sessions')->where('id', $oldId)->first();
                $otherSession['id'] = $otherSessionId;
                DB::table('sessions')->insert($otherSession);
                $this->newClient($otherSessionId);
                $this->getJson('/api/user')->assertOk()->assertJsonPath('data.id', $user->id);
            }
            $this->newClient($oldId);
            $this->getJson('/api/user')->assertOk()->assertJsonPath('data.id', $user->id);
            if ($action === 'logout') {
                $this->postJson('/api/logout')->assertNoContent();
            } else {
                $this->deleteJson('/api/user', ['password' => 'password'])->assertNoContent();
            }
            $this->assertDatabaseMissing('sessions', ['id' => $oldId]);
            $this->newClient($oldId);
            $this->getJson('/api/user')->assertUnauthorized();
            if ($action === 'delete') {
                $this->assertDatabaseMissing('sessions', ['id' => $otherSessionId]);
                $this->newClient($otherSessionId);
                $this->getJson('/api/user')->assertUnauthorized();
            }
        }
    }

    private function newClient(?string $sessionId = null): void
    {
        $this->app['auth']->forgetGuards();
        $this->app['auth']->shouldUse('web');
        $this->app->forgetInstance('auth.driver');
        $this->app['session']->forgetDrivers();
        $this->app->forgetInstance('session.store');
        $this->defaultCookies = $sessionId === null ? [] : [config('session.cookie') => $sessionId];
    }
}
