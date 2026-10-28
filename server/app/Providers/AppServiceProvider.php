<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        foreach (['register', 'login', 'forgot-password', 'reset-password'] as $endpoint) {
            RateLimiter::for($endpoint, fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        }

        ResetPassword::createUrlUsing(fn (object $notifiable, string $token): string => rtrim(config('app.spa_url'), '/').'/#/reset-password/'.$token.'?email='.rawurlencode($notifiable->getEmailForPasswordReset()));
    }
}
