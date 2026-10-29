<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\DeleteAccountRequest;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\LearningProgressStore;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request, LearningProgressStore $store): JsonResponse
    {
        $user = DB::transaction(function () use ($request, $store): User {
            $newsletterConsent = $request->boolean('newsletter_consent');
            $user = User::create([
                ...$request->safe()->only(['email', 'call_sign', 'password']),
                'privacy_policy_version' => User::PRIVACY_POLICY_VERSION,
                'privacy_consented_at' => now(),
                'newsletter_consent' => $newsletterConsent,
                'newsletter_consent_version' => User::NEWSLETTER_CONSENT_VERSION,
                'newsletter_consented_at' => $newsletterConsent ? now() : null,
                'newsletter_consent_recorded_at' => now(),
            ]);
            if ($request->has('progress')) {
                $document = json_decode($request->getContent(), true)['progress'];
                $store->save($user, $document);
            }

            return $user;
        });
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function login(LoginRequest $request): UserResource
    {
        if (! Auth::guard('web')->attempt($request->validated())) {
            throw ValidationException::withMessages(['email' => [__('auth.failed')]]);
        }
        $request->session()->regenerate();

        return new UserResource($request->user());
    }

    public function user(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function logout(Request $request): Response
    {
        abort_unless((string) $request->header('X-Progress-Owner') === (string) $request->user()->id, 409);
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        Password::sendResetLink($request->validated());

        return response()->json(['message' => 'If an account exists, a password reset link has been sent.']);
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset($request->validated(), function (User $user, string $password): void {
            $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
            event(new PasswordReset($user));
        });
        if ($status !== Password::PasswordReset) {
            throw ValidationException::withMessages(['email' => [__($status)]]);
        }

        return response()->json(['message' => __($status)]);
    }

    public function destroy(DeleteAccountRequest $request): Response
    {
        $user = $request->user();
        $response = $this->logout($request);
        DB::transaction(function () use ($user): void {
            DB::table('sessions')->where('user_id', $user->id)->delete();
            Password::deleteToken($user);
            $user->delete();
        });

        return $response;
    }
}
